import { Controller, Get, Query } from '@nestjs/common';
import { DataSourceService } from './data-source.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Data Sources')
@Controller('data-source')
export class DataSourceController {
  constructor(private readonly dataSourceService: DataSourceService) {}

  @ApiOperation({ summary: 'Get data sources by IDs, including their options' })
  @ApiQuery({
    name: 'ids',
    description: 'Array of data source IDs',
    type: [Number],
    required: true,
  })
  @Get()
  async getDataSourcesByIds(@Query('ids') ids: string) {
    // Convert the query parameter to an array of numbers
    const idArray = ids.split(',').map((id) => parseInt(id.trim(), 10));
    if (idArray.some(isNaN)) {
      throw new Error('Invalid ID format');
    }
    return this.dataSourceService.getDataSourcesByIds(idArray);
  }
}
