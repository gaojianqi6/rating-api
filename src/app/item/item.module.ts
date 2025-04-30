import { Module } from '@nestjs/common';
import { ItemController } from './item.controller';
import { ItemService } from './item.service';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [ItemController, RatingController],
  providers: [ItemService, RatingService, PrismaService],
})
export class ItemModule {}
