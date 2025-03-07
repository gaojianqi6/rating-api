// src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'User name' })
  username: string;

  @ApiProperty({ description: 'User password' })
  password: string;
}
