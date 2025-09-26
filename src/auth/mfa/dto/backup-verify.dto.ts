import { IsString, IsNotEmpty, Length } from 'class-validator';

export class BackupVerifyDto {
  @IsString() @IsNotEmpty()
  userId!: string;

  @IsString() @IsNotEmpty()
  tenantId!: string;

  @IsString() @IsNotEmpty() @Length(8, 8)
  code!: string;
}

