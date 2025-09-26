// path: src/scm/dto/update-supplier.dto.ts
// purpose: DTO for updating suppliers
// dependencies: class-validator, @nestjs/mapped-types

import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierDto } from './create-supplier.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}