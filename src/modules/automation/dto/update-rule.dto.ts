// path: backend/src/modules/automation/dto/update-rule.dto.ts
// purpose: DTO for updating business rules
// dependencies: class-validator, class-transformer

import { PartialType } from '@nestjs/swagger';
import { CreateRuleDto } from './create-rule.dto';

export class UpdateRuleDto extends PartialType(CreateRuleDto) {}