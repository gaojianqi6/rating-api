import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ItemService } from './item.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateItemDto } from './dto/create-item.dto';
import { SearchItemsDto } from './dto/search-items.dto';

@ApiTags('Items')
@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @ApiOperation({ summary: 'Search items by template and field filters' })
  @ApiBody({
    type: SearchItemsDto,
    description: 'Search parameters sent in the request body',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of items with pagination metadata',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              slug: { type: 'string' },
              poster: { type: 'string' },
              createdAt: { type: 'string' },
              avgRating: { type: 'number', format: 'float' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            pageSize: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @Post('search')
  async searchItems(@Body() body: SearchItemsDto) {
    const searchDto: SearchItemsDto = {
      templateId: body.templateId, // Required, must be provided
      fields: body.fields || [],
      sort: body.sort || 'date', // Default to 'date' if not provided
      pageSize: body.pageSize || 20,
      pageNo: body.pageNo || 1,
    };

    return this.itemService.searchItems(searchDto);
  }

  @ApiOperation({ summary: 'Create a rating item using a template' })
  @ApiBody({ type: CreateItemDto })
  @UseGuards(JwtAuthGuard)
  @Post()
  async createItem(@Body() dto: CreateItemDto, @Req() req) {
    return this.itemService.createItem(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Get a specific rating item by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the item to retrieve' })
  @Get(':id')
  async getItemById(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.getItemById(id);
  }

  @ApiOperation({ summary: 'Get a specific rating item by slug' })
  @ApiParam({ name: 'slug', description: 'The slug of the item to retrieve' })
  @Get('slug/:slug')
  async getItemBySlug(@Param('slug') slug: string) {
    return this.itemService.getItemBySlug(slug);
  }

  @ApiOperation({ summary: 'Get recommended items by template ID' })
  @ApiParam({
    name: 'templateId',
    description: 'The ID of the template (e.g., 1 for movie, 6 for show)',
  })
  @Get('recommendations/template/:templateId')
  async getRecommendationsByTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.itemService.getRecommendationsByTemplate(templateId);
  }

  @ApiOperation({ summary: 'Get recommended items by genre field' })
  @ApiParam({
    name: 'templateId',
    description: 'The ID of the template (e.g., 1 for movie, 6 for show)',
  })
  @ApiParam({
    name: 'templateFieldId',
    description: 'The ID of the genre field (e.g., 7 for movie genre)',
  })
  @ApiQuery({
    name: 'genreValues',
    description:
      'Comma-separated list of genre values (e.g., Science Fiction,Drama,Thriller)',
    required: true,
  })
  @Get('recommendations/genre/:templateId/:templateFieldId')
  async getRecommendationsByGenre(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('templateFieldId', ParseIntPipe) templateFieldId: number,
    @Query('genreValues') genreValues: string,
  ) {
    const genreValuesArray = genreValues.split(',').map((v) => v.trim());
    return this.itemService.getRecommendationsByGenre(
      templateId,
      templateFieldId,
      genreValuesArray,
    );
  }
}
