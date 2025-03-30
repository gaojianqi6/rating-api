import { ApiProperty } from '@nestjs/swagger';

export class TemplateDropdownDto {
  @ApiProperty({ description: 'The ID of the template' })
  value: number;

  @ApiProperty({ description: 'The display name of the template' })
  label: string;
}
