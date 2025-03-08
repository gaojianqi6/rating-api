import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDate } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'The username of the user.' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'The email of the user.' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The password of the user.' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'The nickname of the user.', required: false })
  @IsString()
  @IsOptional()
  nickname?: string;

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
