// path: src/scm/dto/update-inventory-item.dto.ts
// purpose: DTO for updating inventory items
// dependencies: class-validator, @nestjs/mapped-types

import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryItemDto } from './create-inventory-item.dto';

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {}