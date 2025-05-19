import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class SendRegisterEmailDto {
  @ApiProperty({
    description: 'Email address to send verification code to',
    example: 'user@example.com',
    required: true,
  })
  @IsString()
  email: string;
}
