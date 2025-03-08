import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDate } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'The updated email of the user.',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The updated name of the user.',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'The Google ID of the user.', required: false })
  @IsString()
  @IsOptional()
  googleId?: string;

  @ApiProperty({
    description: 'The timestamp when the user last logged in.',
    required: false,
  })
  @IsDate()
  @IsOptional()
  loggedInAt?: Date;
}
