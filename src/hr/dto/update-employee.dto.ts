// path: src/hr/dto/update-employee.dto.ts
// purpose: DTO for updating employees
// dependencies: class-validator, @nestjs/mapped-types

import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}