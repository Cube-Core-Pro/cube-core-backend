// path: src/banking/fraud/dto/update-fraud-rule.dto.ts
// purpose: DTO for updating fraud rules
// dependencies: class-validator, PartialType

import { PartialType } from '@nestjs/swagger';
import { CreateFraudRuleDto } from './create-fraud-rule.dto';

export class UpdateFraudRuleDto extends PartialType(CreateFraudRuleDto) {}