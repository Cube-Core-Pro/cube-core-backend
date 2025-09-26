// path: src/banking/accounting/dto/update-account.dto.ts
// purpose: DTO for updating chart of accounts
// dependencies: class-validator, PartialType

import { PartialType } from '@nestjs/swagger';
import { CreateAccountDto } from './create-account.dto';

export class UpdateAccountDto extends PartialType(CreateAccountDto) {}