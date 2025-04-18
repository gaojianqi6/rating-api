import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, Matches, IsNotEmpty } from 'class-validator';

export class PresignedUrlDto {
  @ApiProperty({
    description: 'Name of the file to upload (e.g., "poster.jpg")',
    example: 'poster.jpg',
  })
  @IsString()
  @IsNotEmpty({ message: 'Filename cannot be empty' })
  @Matches(/\.(jpg|jpeg|png)$/i, {
    message: 'Filename must end with .jpg, .jpeg, or .png',
  })
  filename: string;

  @ApiProperty({
    description: 'Content type of the file (e.g., "image/jpeg")',
    example: 'image/jpeg',
    enum: ['image/jpeg', 'image/png'],
  })
  @IsString()
  @IsNotEmpty({ message: 'Content type cannot be empty' })
  @IsIn(['image/jpeg', 'image/png'], {
    message: 'Content type must be image/jpeg or image/png',
  })
  contentType: string;

  @ApiProperty({
    description: 'Type of item (movie, tv, book etc.)',
    example: 'movie',
  })
  @IsString()
  @IsNotEmpty({ message: 'Type cannot be empty' })
  type: string;
}
