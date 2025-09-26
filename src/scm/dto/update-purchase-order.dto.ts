// path: src/scm/dto/update-purchase-order.dto.ts
// purpose: DTO for updating purchase orders
// dependencies: class-validator, @nestjs/mapped-types

import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}