// path: backend/src/modules/automation/dto/update-business-process.dto.ts
// purpose: DTO for updating business processes
// dependencies: class-validator, class-transformer

import { PartialType } from '@nestjs/swagger';
import { CreateBusinessProcessDto } from './create-business-process.dto';

export class UpdateBusinessProcessDto extends PartialType(CreateBusinessProcessDto) {}