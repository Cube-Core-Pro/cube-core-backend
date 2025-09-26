// path: backend/src/users/dto/update-user.dto.ts
// purpose: Data transfer object for user updates
// dependencies: PartialType, CreateUserDto

import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {}