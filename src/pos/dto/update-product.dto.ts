// path: src/pos/dto/update-product.dto.ts
// purpose: DTO for updating POS products
// dependencies: class-validator, @nestjs/swagger

import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}