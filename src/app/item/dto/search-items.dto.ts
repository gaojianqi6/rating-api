import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class FieldFilter {
  @ApiProperty({ description: 'The ID of the field to filter on', example: 7 })
  @IsInt()
  fieldId: number;

  @ApiProperty({
    description: 'The values to filter for the field',
    example: ['Science Fiction', 'Drama'],
  })
  @IsArray()
  fieldValue: any[];
}

export class SearchItemsDto {
  @ApiProperty({
    description: 'The ID of the template (e.g., 1 for movie)',
    example: 1,
    required: true,
  })
  @IsInt()
  templateId: number;

  @ApiProperty({
    description: 'Array of field filters',
    type: [FieldFilter],
    example: [
      { fieldId: 7, fieldValue: ['Science Fiction', 'Drama'] },
      { fieldId: 3, fieldValue: [1999] },
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  fields?: FieldFilter[];

  @ApiProperty({
    description: 'Sort by: date, score, or popularity',
    enum: ['date', 'score', 'popularity'],
    example: 'date',
    required: false,
  })
  @IsOptional()
  @IsEnum(['date', 'score', 'popularity'])
  sort?: 'date' | 'score' | 'popularity';

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @ApiProperty({ description: 'Page number', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageNo?: number;
}
