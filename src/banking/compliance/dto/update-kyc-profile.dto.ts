// path: src/banking/compliance/dto/update-kyc-profile.dto.ts
// purpose: DTO for updating KYC profiles
// dependencies: class-validator, PartialType

import { PartialType } from '@nestjs/swagger';
import { CreateKycProfileDto } from './create-kyc-profile.dto';

export class UpdateKycProfileDto extends PartialType(CreateKycProfileDto) {}