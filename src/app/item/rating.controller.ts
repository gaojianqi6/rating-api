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
import { RatingService } from './rating.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateRatingDto } from './dto/create-rating.dto';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @ApiOperation({ summary: 'Create or update a rating for an item' })
  @ApiBody({ type: CreateRatingDto })
  @UseGuards(JwtAuthGuard)
  @Post()
  async createRating(@Body() dto: CreateRatingDto, @Req() req) {
    return this.ratingService.createOrUpdateRating(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Get the authenticated user's rating for an item" })
  @ApiParam({ name: 'itemId', description: 'The ID of the item' })
  @UseGuards(JwtAuthGuard)
  @Get('my-rating/:itemId')
  async getUserRating(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Req() req,
  ) {
    return this.ratingService.getUserRating(req.user.userId, itemId);
  }

  @ApiOperation({ summary: 'Get all ratings for an item, including average' })
  @ApiParam({ name: 'itemId', description: 'The ID of the item' })
  @Get(':itemId')
  async getRatingsForItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.ratingService.getRatingsForItem(itemId);
  }
}
