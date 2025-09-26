import { IsString, IsNotEmpty } from 'class-validator';

export class TotpSetupDto {
  @IsString() @IsNotEmpty()
  userId!: string;

  @IsString() @IsNotEmpty()
  tenantId!: string;

  @IsString() @IsNotEmpty()
  deviceName!: string;
}

