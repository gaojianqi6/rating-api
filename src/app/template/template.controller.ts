import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TemplateService } from './template.service';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

@ApiTags('Templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @ApiOperation({ summary: 'Get all templates for dropdown selection' })
  @Get()
  async getTemplatesForDropdown() {
    return this.templateService.getTemplatesForDropdown();
  }

  @ApiOperation({
    summary: 'Get a specific template by ID, including its fields',
  })
  @ApiParam({
    name: 'templateId',
    description: 'The ID of the template to retrieve',
  })
  @Get(':templateId')
  async getTemplateById(@Param('templateId', ParseIntPipe) templateId: number) {
    return this.templateService.getTemplateById(templateId);
  }

  @ApiOperation({
    summary: 'Get a specific template by name, including its fields',
  })
  @ApiParam({
    name: 'templateName',
    description: 'The name of the template to retrieve (e.g., "movie")',
  })
  @Get('by-name/:templateName')
  async getTemplateByName(@Param('templateName') templateName: string) {
    return this.templateService.getTemplateByName(templateName);
  }
}
