import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ItemService } from './item.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateItemDto } from './dto/create-item.dto';

@ApiTags('Items')
@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

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
}
