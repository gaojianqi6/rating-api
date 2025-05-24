import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ItemService } from './item.service';
import { PrismaService } from '@/prisma/prisma.service';

interface TestRatingResult {
  template: string;
  item: string;
  user: string;
  rating: number;
  comment: string;
}

interface RecommendationItem {
  id: number;
  title: string;
  slug: string;
  poster: string;
  createdAt: string;
  avgRating: number;
}

interface RequestWithUser extends Request {
  user: {
    userId: number;
    username: string;
  };
}

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(
    private readonly ratingService: RatingService,
    private readonly itemService: ItemService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Create or update a rating for an item' })
  @ApiBody({ type: CreateRatingDto })
  @UseGuards(JwtAuthGuard)
  @Post()
  async createRating(
    @Body() dto: CreateRatingDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ratingService.createOrUpdateRating(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Get the authenticated user's rating for an item" })
  @ApiParam({ name: 'itemId', description: 'The ID of the item' })
  @UseGuards(JwtAuthGuard)
  @Get('my-rating/:itemId')
  async getUserRating(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.ratingService.getUserRating(req.user.userId, itemId);
  }

  @ApiOperation({ summary: 'Add test rating data for recommendations' })
  @Get('add-test-rating-data')
  async addTestRatingData() {
    // Get all templates
    const templates = await this.prisma.template.findMany({
      where: { isPublished: true },
    });

    // Get first two users
    const users = await this.prisma.user.findMany({
      take: 2,
    });

    if (users.length < 2) {
      throw new HttpException(
        'Need at least 2 users to generate test data',
        HttpStatus.BAD_REQUEST,
      );
    }

    const randomComments = [
      'Great content, really enjoyed it!',
      'A masterpiece that exceeded my expectations.',
      'Solid performance, worth watching.',
      'Interesting plot with good character development.',
      'Highly recommended, especially for fans of the genre.',
    ];

    const results: TestRatingResult[] = [];

    // For each template
    for (const template of templates) {
      // Get recommendations for the template
      const recommendations =
        (await this.itemService.getRecommendationsByTemplate(
          template.id,
        )) as RecommendationItem[];

      // For each recommendation
      for (const item of recommendations) {
        // For each user
        for (const user of users) {
          // Generate random rating between 6 and 10 with 0.5 step
          const rating = Math.floor(Math.random() * 5) + 6; // 6-10
          const decimal = Math.random() < 0.5 ? 0 : 0.5;
          const finalRating = Math.min(rating + decimal, 10); // Ensure we don't exceed 10

          // Random comment
          const comment =
            randomComments[Math.floor(Math.random() * randomComments.length)];

          // Create rating
          const ratingDto: CreateRatingDto = {
            itemId: item.id,
            rating: finalRating,
            reviewText: comment,
          };

          await this.ratingService.createOrUpdateRating(user.id, ratingDto);
          results.push({
            template: template.name,
            item: item.title,
            user: user.username,
            rating: finalRating,
            comment,
          });
        }
      }
    }

    return {
      message: 'Test rating data added successfully',
      results,
    };
  }

  @ApiOperation({ summary: 'Get all ratings for an item, including average' })
  @ApiParam({ name: 'itemId', description: 'The ID of the item' })
  @Get(':itemId')
  async getRatingsForItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.ratingService.getRatingsForItem(itemId);
  }
}
