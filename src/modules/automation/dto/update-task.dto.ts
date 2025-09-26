// path: backend/src/modules/automation/dto/update-task.dto.ts
// purpose: DTO for updating scheduled tasks
// dependencies: class-validator, class-transformer

import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}