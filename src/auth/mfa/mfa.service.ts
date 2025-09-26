import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly encKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('MFA_TOTP_ENCRYPTION_KEY');
    if (!key) {
      // fallback: derive from JWT secret (not ideal for prod, but functional)
      const seed = this.config.get<string>('JWT_SECRET') || 'cube-core-default-secret';
      this.encKey = crypto.createHash('sha256').update(seed).digest();
    } else {
      // Accept base64 or hex or raw string; ensure 32 bytes
      let buf: Buffer;
      try {
        if (/^[A-Za-z0-9+/=]+$/.test(key) && key.length % 4 === 0) {
          buf = Buffer.from(key, 'base64');
        } else if (/^[0-9a-fA-F]+$/.test(key)) {
          buf = Buffer.from(key, 'hex');
        } else {
          buf = Buffer.from(key, 'utf8');
        }
      } catch {
        buf = Buffer.from(key, 'utf8');
      }
      if (buf.length < 32) {
        const hash = crypto.createHash('sha256').update(buf).digest();
        this.encKey = hash;
      } else if (buf.length > 32) {
        this.encKey = buf.subarray(0, 32);
      } else {
        this.encKey = buf;
      }
    }
  }

  // Symmetric encryption helpers (AES-256-GCM)
  private encrypt(plain: string): { cipherText: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      cipherText: enc.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  private decrypt(enc: { cipherText: string; iv: string; tag: string }): string {
    const iv = Buffer.from(enc.iv, 'base64');
    const tag = Buffer.from(enc.tag, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([
      decipher.update(Buffer.from(enc.cipherText, 'base64')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  }

  private generateBackupCodes(count = 10): string[] {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 10; j++) {
        const idx = crypto.randomInt(0, alphabet.length);
        code += alphabet[idx];
      }
      codes.push(code);
    }
    return codes;
  }

  async setupTotp(userId: string, tenantId: string, deviceName: string) {
    if (!userId || !tenantId || !deviceName) {
      throw new BadRequestException('Missing required fields');
    }

    // Create TOTP secret (base32)
    const secret = authenticator.generateSecret();
    const { cipherText, iv, tag } = this.encrypt(secret);

    // Store device pending verification
    const device = await this.prisma.mfaDevice.create({
      data: {
        userId,
        tenantId,
        method: 'TOTP',
        name: deviceName,
        status: 'PENDING_SETUP',
        isPrimary: true,
        verified: false,
        secretEncrypted: `${cipherText}:${tag}`,
        iv,
      },
    });

    const otpauth = authenticator.keyuri(userId, 'CubeCore', secret);

    // Generate and store backup codes (hashed)
    const codes = this.generateBackupCodes();
    const hashRounds = 12;
    await this.prisma.mfaBackupCode.createMany({
      data: codes.map((c) => ({ deviceId: device.id, codeHash: bcrypt.hashSync(c, hashRounds) })),
    });

    return {
      deviceId: device.id,
      otpauthUrl: otpauth,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`,
      // Return secret only during setup for QR apps; do not persist on client
      secret,
      backupCodes: codes,
    };
  }

  async verifyTotp(userId: string, code: string) {
    if (!code || !/^\d{6}$/.test(code)) {
      throw new BadRequestException('Invalid code');
    }

    const device = await this.prisma.mfaDevice.findFirst({
      where: { userId, method: 'TOTP', status: { in: ['PENDING_SETUP', 'ENABLED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!device || !device.secretEncrypted || !device.iv) {
      throw new UnauthorizedException('No TOTP device to verify');
    }

    const [cipherText, tag] = device.secretEncrypted.split(':');
    const secret = this.decrypt({ cipherText, iv: device.iv, tag });

    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) {
      return { success: false };
    }

    await this.prisma.mfaDevice.update({
      where: { id: device.id },
      data: { verified: true, status: 'ENABLED', lastUsedAt: new Date() },
    });

    return { success: true };
  }

  async regenerateBackupCodes(userId: string) {
    const device = await this.prisma.mfaDevice.findFirst({
      where: { userId, method: 'TOTP', status: 'ENABLED', verified: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!device) throw new BadRequestException('No enabled TOTP device');

    // Invalidate previous codes (mark used)
    await this.prisma.mfaBackupCode.updateMany({
      where: { deviceId: device.id, used: false },
      data: { used: true, usedAt: new Date() },
    });

    const codes = this.generateBackupCodes();
    const hashRounds = 12;
    await this.prisma.mfaBackupCode.createMany({
      data: codes.map((c) => ({ deviceId: device.id, codeHash: bcrypt.hashSync(c, hashRounds) })),
    });

    return { backupCodes: codes };
  }

  async verifyBackupCode(userId: string, code: string) {
    if (!code) throw new BadRequestException('Code required');

    const devices = await this.prisma.mfaDevice.findMany({
      where: { userId, method: 'TOTP' },
      select: { id: true },
    });
    const deviceIds = devices.map((d) => d.id);
    if (deviceIds.length === 0) return { success: false };

    const codes = await this.prisma.mfaBackupCode.findMany({
      where: { deviceId: { in: deviceIds }, used: false },
      orderBy: { createdAt: 'desc' },
    });

    for (const record of codes) {
      if (await bcrypt.compare(code, record.codeHash)) {
        await this.prisma.mfaBackupCode.update({
          where: { id: record.id },
          data: { used: true, usedAt: new Date() },
        });
        return { success: true };
      }
    }
    return { success: false };
  }

  async hasEnabledTotp(userId: string): Promise<boolean> {
    const d = await this.prisma.mfaDevice.findFirst({
      where: { userId, method: 'TOTP', status: 'ENABLED', verified: true },
      select: { id: true },
    });
    return !!d;
  }

  async listDevices(userId: string) {
    return this.prisma.mfaDevice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        method: true,
        name: true,
        status: true,
        isPrimary: true,
        verified: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async disableDevice(userId: string, deviceId: string) {
    const device = await this.prisma.mfaDevice.findUnique({ where: { id: deviceId } });
    if (!device || device.userId !== userId) {
      throw new UnauthorizedException('Device not found');
    }
    await this.prisma.mfaDevice.update({
      where: { id: deviceId },
      data: { status: 'DISABLED', verified: false },
    });
    return { message: 'Device disabled' };
  }
}
