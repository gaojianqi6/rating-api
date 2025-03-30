import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DataSourceService {
  constructor(private prisma: PrismaService) {}

  async getDataSourcesByIds(ids: number[]) {
    if (!ids || ids.length === 0) {
      throw new HttpException('No IDs provided', HttpStatus.BAD_REQUEST);
    }

    const dataSources = await this.prisma.fieldDataSource.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        options: true, // Include all related options
      },
    });

    if (dataSources.length === 0) {
      throw new HttpException(
        'No data sources found for the provided IDs',
        HttpStatus.NOT_FOUND,
      );
    }

    return dataSources;
  }
}
