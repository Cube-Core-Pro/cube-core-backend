// path: src/banking/accounting/dto/update-journal-entry.dto.ts
// purpose: DTO for updating journal entries
// dependencies: class-validator, PartialType

import { PartialType } from '@nestjs/swagger';
import { CreateJournalEntryDto } from './create-journal-entry.dto';

export class UpdateJournalEntryDto extends PartialType(CreateJournalEntryDto) {}