import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FieldValueDto {
  @ApiProperty({ description: 'The Name of the template field' })
  @IsInt()
  fieldName: string;

  @ApiProperty({ description: 'The value for the field' })
  value: any;
}

export class CreateItemDto {
  @ApiProperty({ description: 'The ID of the template to use' })
  @IsInt()
  templateId: number;

  @ApiProperty({ description: 'The title of the item' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Array of field values for the item' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValueDto)
  fieldValues: FieldValueDto[];
}
