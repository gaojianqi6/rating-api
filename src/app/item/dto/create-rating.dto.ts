import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ description: 'The ID of the item to rate' })
  @IsInt()
  itemId: number;

  @ApiProperty({
    description: 'The rating score (0 to 10, with 1 decimal place)',
  })
  @IsNumber()
  @Min(0)
  @Max(10)
  rating: number;

  @ApiProperty({
    description: 'The review comment (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  reviewText?: string;
}
