// path: src/banking/fraud/dto/update-fraud-alert.dto.ts
// purpose: DTO for updating fraud alerts
// dependencies: class-validator, PartialType

import { PartialType } from '@nestjs/swagger';
import { CreateFraudAlertDto } from './create-fraud-alert.dto';

export class UpdateFraudAlertDto extends PartialType(CreateFraudAlertDto) {}