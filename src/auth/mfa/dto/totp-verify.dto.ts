import { IsString, IsNotEmpty, Length } from 'class-validator';

export class TotpVerifyDto {
  @IsString() @IsNotEmpty()
  userId!: string;

  @IsString() @IsNotEmpty()
  tenantId!: string;

  @IsString() @IsNotEmpty() @Length(6, 6)
  code!: string;
}

