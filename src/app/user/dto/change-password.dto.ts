import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password of the user',
    example: 'oldPassword123',
  })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'newPassword123',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match newPassword)',
    example: 'newPassword123',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  confirmPassword: string;
}
