// path: backend/src/auth/dto/forgot-password.dto.ts
// purpose: Data transfer object for forgot password request
// dependencies: class-validator, swagger

import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}