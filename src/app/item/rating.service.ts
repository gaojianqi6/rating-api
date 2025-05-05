import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UserRating, Prisma } from '@prisma/client';

// Define a response type that matches UserRating but with rating as number
type UserRatingResponse = Omit<UserRating, 'rating'> & { rating: number };

@Injectable()
export class RatingService {
  constructor(private prisma: PrismaService) {}

  // Create or update a user's rating for an item
  async createOrUpdateRating(
    userId: number,
    dto: CreateRatingDto,
  ): Promise<UserRatingResponse> {
    const { itemId, rating, reviewText } = dto;
    console.log('Create rating:', itemId, rating, reviewText);

    // Validate item exists
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
    }

    // Check if user exists (optional, since userId comes from JWT)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Use upsert to create or update the rating
    const userRating = await this.prisma.userRating.upsert({
      where: {
        itemId_userId: { itemId: itemId, userId: userId },
      },
      update: {
        rating: new Prisma.Decimal(rating), // Convert number to Decimal
        reviewText,
        updatedAt: new Date(),
      },
      create: {
        itemId,
        userId,
        rating: new Prisma.Decimal(rating), // Convert number to Decimal
        reviewText,
      },
    });

    // Update item statistics (average rating and count)
    await this.updateItemStatistics(itemId);

    // Return the modified object with rating as number
    return {
      ...userRating,
      rating: (userRating.rating as unknown as Prisma.Decimal).toNumber(), // Type assertion
    };
  }

  // Get the authenticated user's rating for an item
  async getUserRating(
    userId: number,
    itemId: number,
  ): Promise<UserRatingResponse | null> {
    // Validate item exists
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
    }

    const userRating = await this.prisma.userRating.findUnique({
      where: {
        itemId_userId: { itemId: itemId, userId: userId },
      },
    });

    if (!userRating) {
      return null;
    }

    // Return the modified object with rating as number
    return {
      ...userRating,
      rating: (userRating.rating as unknown as Prisma.Decimal).toNumber(), // Type assertion
    };
  }

  // Get all ratings for an item, including average and count
  async getRatingsForItem(itemId: number): Promise<{
    averageRating: number;
    ratingsCount: number;
    ratings: Array<
      UserRatingResponse & { user: { id: number; username: string } }
    >;
  }> {
    // Validate item exists
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
    }

    // Calculate average rating and count
    // Adjust type to match runtime behavior (Prisma.Decimal | null)
    const aggregate: {
      _avg: { rating: Prisma.Decimal | null };
      _count: { id: number };
    } = await this.prisma.userRating.aggregate({
      where: { itemId: itemId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const averageRating: number = aggregate._avg.rating
      ? aggregate._avg.rating.toNumber()
      : 0;
    const ratingsCount: number = aggregate._count.id;

    // Fetch all ratings with user details
    const ratings = await this.prisma.userRating.findMany({
      where: { itemId: itemId },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' }, // Newest first
    });

    // Convert Decimal to number in the ratings array
    const formattedRatings = ratings.map((rating) => ({
      ...rating,
      rating: (rating.rating as unknown as Prisma.Decimal).toNumber(),
    }));

    return {
      averageRating: Number(averageRating.toFixed(1)), // Round to 1 decimal place
      ratingsCount,
      ratings: formattedRatings,
    };
  }

  // Helper method to update item statistics
  private async updateItemStatistics(itemId: number): Promise<void> {
    // Calculate average rating and count
    // Adjust type to match runtime behavior (Prisma.Decimal | null)
    const aggregate: {
      _avg: { rating: Prisma.Decimal | null };
      _count: { id: number };
    } = await this.prisma.userRating.aggregate({
      where: { itemId: itemId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const averageRating: number = aggregate._avg.rating
      ? aggregate._avg.rating.toNumber()
      : 0;
    const ratingsCount: number = aggregate._count.id;

    await this.prisma.itemStatistics.upsert({
      where: { itemId },
      update: {
        avgRating: Number(averageRating.toFixed(1)),
        ratingsCount,
      },
      create: {
        itemId,
        avgRating: Number(averageRating.toFixed(1)),
        ratingsCount,
        viewsCount: 0, // Default for new statistics
      },
    });
  }
}
