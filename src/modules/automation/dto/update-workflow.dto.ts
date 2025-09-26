// path: backend/src/modules/automation/dto/update-workflow.dto.ts
// purpose: DTO for updating workflows
// dependencies: class-validator, class-transformer

import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowDto } from './create-workflow.dto';

export class UpdateWorkflowDto extends PartialType(CreateWorkflowDto) {}