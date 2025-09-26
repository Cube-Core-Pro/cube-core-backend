// path: src/hr/dto/update-leave-request.dto.ts
// purpose: DTO for updating leave requests
// dependencies: @nestjs/swagger, class-validator

import { PartialType } from '@nestjs/swagger';
import { CreateLeaveRequestDto } from './create-leave-request.dto';

export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {}