import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    if (!userWhereUniqueInput || !userWhereUniqueInput.id) {
      throw new BadRequestException(
        'User ID is required to fetch user details.',
      );
    }
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({
      data,
      where,
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    });
  }

  async getUserRatings(userId: number): Promise<
    Array<{
      templateId: number;
      templateName: string;
      templateDisplayName: string;
      ratings: Array<{
        id: number;
        title: string;
        slug: string;
        year: number;
        poster: string;
        rating: number;
        comment: string;
      }>;
    }>
  > {
    // Fetch all templates
    const templates = await this.prisma.template.findMany();

    // Fetch all ratings for the user, including related item, template, and field values
    const ratings = await this.prisma.userRating.findMany({
      where: { userId },
      include: {
        item: {
          include: {
            template: true,
            fieldValues: {
              include: {
                field: true,
              },
            },
          },
        },
      },
    });

    // Group ratings by template
    const groupedRatings = templates.map((template) => {
      const templateRatings = ratings
        .filter((rating) => rating.item.templateId === template.id)
        .map((rating) => {
          let year = 0;
          let poster = '';

          for (const fieldValue of rating.item.fieldValues) {
            const fieldName = fieldValue.field.name.toLowerCase();
            if (fieldName === 'year' || fieldName === 'release_year') {
              year = fieldValue.numericValue
                ? Math.floor(fieldValue.numericValue)
                : 0;
            }
            if (fieldName === 'poster' || fieldName === 'image') {
              poster = fieldValue.textValue || '';
            }
          }

          return {
            id: rating.item.id,
            title: rating.item.title,
            slug: rating.item.slug,
            year,
            poster,
            rating: Number(rating.rating),
            comment: rating.reviewText || '',
          };
        });

      return {
        templateId: template.id,
        templateName: template.name,
        templateDisplayName: template.displayName,
        ratings: templateRatings,
      };
    });

    return groupedRatings;
  }
}
