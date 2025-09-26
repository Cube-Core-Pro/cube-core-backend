// path: src/banking/compliance/dto/update-aml-alert.dto.ts
// purpose: DTO for updating AML alerts
// dependencies: class-validator, PartialType

import { PartialType } from '@nestjs/swagger';
import { CreateAmlAlertDto } from './create-aml-alert.dto';

export class UpdateAmlAlertDto extends PartialType(CreateAmlAlertDto) {}