import { Body, Controller, Post, UseGuards, Req, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MfaService } from './mfa.service';
import { TotpSetupDto } from './dto/totp-setup.dto';
import { TotpVerifyDto } from './dto/totp-verify.dto';

@ApiTags('auth')
@Controller('v1/auth/2fa')
@ApiBearerAuth()
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('totp/setup')
  @ApiOperation({ summary: 'Initiate TOTP setup (returns secret and QR)' })
  async setupTotp(@Req() req: any, @Body() dto: TotpSetupDto) {
    const userId = req.user?.id || dto.userId; // prefer JWT
    const tenantId = req.user?.tenantId || dto.tenantId;
    return this.mfaService.setupTotp(userId, tenantId, dto.deviceName);
  }

  @UseGuards(JwtAuthGuard)
  @Post('totp/verify')
  @ApiOperation({ summary: 'Verify TOTP code and enable device' })
  async verifyTotp(@Req() req: any, @Body() dto: TotpVerifyDto) {
    const userId = req.user?.id || dto.userId;
    return this.mfaService.verifyTotp(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('backup-codes')
  @ApiOperation({ summary: 'Generate new backup codes' })
  async generateBackupCodes(@Req() req: any) {
    const userId = req.user?.id;
    return this.mfaService.regenerateBackupCodes(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('backup-codes/verify')
  @ApiOperation({ summary: 'Verify a backup code' })
  async verifyBackupCode(@Req() req: any, @Body() body: { code: string }) {
    const userId = req.user?.id;
    return this.mfaService.verifyBackupCode(userId, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('devices/:id/disable')
  @ApiOperation({ summary: 'Disable an MFA device' })
  async disableDevice(@Req() req: any, @Param('id') id: string) {
    return this.mfaService.disableDevice(req.user?.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('devices')
  @ApiOperation({ summary: 'List MFA devices' })
  async listDevices(@Req() req: any) {
    return this.mfaService.listDevices(req.user?.id);
  }
}
