// path: backend/src/modules/automation/dto/update-integration.dto.ts
// purpose: DTO for updating system integrations
// dependencies: class-validator, class-transformer

import { PartialType } from '@nestjs/swagger';
import { CreateIntegrationDto } from './create-integration.dto';

export class UpdateIntegrationDto extends PartialType(CreateIntegrationDto) {}