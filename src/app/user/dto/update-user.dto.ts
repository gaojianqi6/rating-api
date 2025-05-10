import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDate } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'The updated username of the user.',
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'The updated nickname of the user.',
    required: false,
  })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({
    description: 'The updated email of the user.',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The avatar url of the user.',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'The description of the user.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The country of the user.',
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;

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
