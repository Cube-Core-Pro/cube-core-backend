// path: backend/src/modules/collaboration/dto/update-document.dto.ts
// purpose: DTO for updating document content during collaboration
// dependencies: class-validator, class-transformer, swagger

import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDocumentDto {
  @ApiProperty({
    description: 'Document content changes',
    example: {
      type: 'delta',
      operations: [
        { retain: 10 },
        { insert: 'Hello World' },
        { delete: 5 }
      ]
    },
  })
  @IsNotEmpty()
  @IsObject()
  content: any;
}