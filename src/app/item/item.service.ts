import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Item, TemplateField } from '@prisma/client';
import slugify from 'slugify';
import { CreateItemDto } from './dto/create-item.dto';
import { SearchItemsDto } from './dto/search-items.dto';

@Injectable()
export class ItemService {
  constructor(private prisma: PrismaService) {}

  async searchItems(dto: SearchItemsDto): Promise<any> {
    const {
      templateId,
      fields,
      sort = 'date',
      pageSize = 20,
      pageNo = 1,
    } = dto;

    // Validate pageSize and pageNo
    if (pageSize < 1) {
      throw new HttpException(
        'pageSize must be at least 1',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (pageNo < 1) {
      throw new HttpException(
        'pageNo must be at least 1',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate template exists
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      include: { fields: true },
    });
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    // Base where clause with templateId
    const whereClause: any = {
      templateId,
    };

    // Add field filters to the where clause
    if (fields && fields.length > 0) {
      const fieldTypes = new Map<number, string>();
      for (const { fieldId } of fields) {
        const field = template.fields.find((f) => f.id === fieldId);
        if (!field) {
          throw new HttpException(
            `Field with ID ${fieldId} not found in template`,
            HttpStatus.BAD_REQUEST,
          );
        }
        fieldTypes.set(fieldId, field.fieldType.toLowerCase());
      }

      // Filter out fields with empty values
      const nonEmptyFields = fields.filter(
        (field) => field.fieldValue && field.fieldValue.length > 0,
      );

      if (nonEmptyFields.length > 0) {
        whereClause.fieldValues = {
          some: {
            OR: nonEmptyFields.map(({ fieldId, fieldValue }) => {
              const fieldType = fieldTypes.get(fieldId)!;
              const firstValue = fieldValue[0]; // Take first value for single-value fields

              if (fieldType === 'multiselect' || fieldType === 'json') {
                return {
                  fieldId,
                  OR: [
                    {
                      jsonValue: {
                        array_contains: [firstValue],
                      },
                    },
                    {
                      jsonValue: {
                        equals: [firstValue],
                      },
                    },
                  ],
                };
              } else if (fieldType === 'number') {
                return {
                  fieldId,
                  numericValue: Number(firstValue),
                };
              } else if (fieldType === 'date') {
                return {
                  fieldId,
                  dateValue: new Date(firstValue),
                };
              } else if (fieldType === 'boolean') {
                return {
                  fieldId,
                  booleanValue: Boolean(firstValue),
                };
              } else {
                // For text, textarea, url, img, select
                return {
                  fieldId,
                  textValue: firstValue.toString(),
                };
              }
            }),
          },
        };
      }
    }

    // Determine sorting
    let orderBy: any;
    if (sort === 'date') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'score') {
      orderBy = { statistics: { avgRating: 'desc' } };
    } else if (sort === 'popularity') {
      orderBy = { statistics: { viewsCount: 'desc' } };
    }

    // Fetch items with pagination
    const items = await this.prisma.item.findMany({
      where: whereClause,
      include: {
        fieldValues: {
          include: { field: true },
        },
        statistics: true,
      },
      orderBy,
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    const total = await this.prisma.item.count({ where: whereClause });

    // Dynamically fetch the poster field ID
    const posterField = await this.prisma.templateField.findFirst({
      where: {
        templateId,
        name: { contains: 'poster', mode: 'insensitive' },
      },
    });
    const posterFieldId = posterField?.id || null;

    // Map to response format
    const responseItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      poster:
        item.fieldValues.find((fv) => fv.fieldId === posterFieldId)
          ?.textValue || 'https://via.placeholder.com/150',
      createdAt: item.createdAt.toISOString().split('T')[0],
      avgRating: item.statistics?.avgRating
        ? Number(item.statistics.avgRating)
        : 0,
    }));

    return {
      items: responseItems,
      pagination: {
        total,
        page: pageNo,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async createItem(userId: number, dto: CreateItemDto): Promise<Item> {
    const { templateId, title, fieldValues } = dto;

    console.info('Logger:', templateId, title, fieldValues);
    // Validate template exists
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      include: { fields: true },
    });
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    // Fetch template fields
    const templateFields = template.fields;
    console.info('Logger templateFields:', templateFields);

    // Validate field values against template fields
    const fieldValueMap = new Map<number, any>();
    for (const { fieldName, value } of fieldValues) {
      const field = templateFields.find((f) => f.name === fieldName);
      if (!field) {
        throw new HttpException(
          `Field with ID ${fieldName} not found in template`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (field.isRequired && (value === null || value === undefined)) {
        throw new HttpException(
          `Field ${field.name} is required`,
          HttpStatus.BAD_REQUEST,
        );
      }
      fieldValueMap.set(field.id, value);
    }

    // Ensure all required fields are provided
    for (const field of templateFields) {
      if (field.isRequired && !fieldValueMap.has(field.id)) {
        throw new HttpException(
          `Required field ${field.name} is missing`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Generate slug from title
    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (
      await this.prisma.item.findFirst({
        where: { templateId, slug },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the item and its field values in a transaction
    return this.prisma.$transaction(async (prisma) => {
      const item = await prisma.item.create({
        data: {
          templateId,
          title,
          slug,
          createdBy: userId,
        },
      });

      // Create field values
      const fieldValueData = fieldValues.map(({ fieldName, value }) => {
        const field = templateFields.find((f) => f.name === fieldName)!;
        const data: any = { itemId: item.id, fieldId: field.id };
        switch (field.fieldType.toLowerCase()) {
          case 'text':
          case 'textarea':
          case 'url':
          case 'img':
            data.textValue = String(value);
            break;

          case 'number':
            data.numericValue = Number(value);
            break;

          case 'date':
            data.dateValue = new Date(value);
            break;

          case 'boolean':
            data.booleanValue = Boolean(value);
            break;

          case 'select':
            data.textValue = String(value);
            break;
          case 'multiselect':
            // For multiselect, store as JSON
            data.jsonValue = Array.isArray(value) ? value : [value];
            break;
          case 'json':
            data.jsonValue =
              typeof value === 'string' ? JSON.parse(value) : value;
            break;

          default:
            throw new HttpException(
              `Unsupported field type: ${field.fieldType}`,
              HttpStatus.BAD_REQUEST,
            );
        }
        return data;
      });

      await prisma.itemFieldValue.createMany({
        data: fieldValueData,
      });

      // Initialize item statistics
      await prisma.itemStatistics.create({
        data: {
          itemId: item.id,
          avgRating: 0,
          ratingsCount: 0,
          viewsCount: 0,
        },
      });

      return item;
    });
  }

  async getItemById(id: number): Promise<Item & { fieldValues: any[] }> {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        fieldValues: {
          include: {
            field: true, // Include the template field details
          },
        },
      },
    });

    if (!item) {
      throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
    }

    return item;
  }

  async getItemBySlug(slug: string): Promise<Item & { fieldValues: any[] }> {
    const item = await this.prisma.item.findUnique({
      where: { slug },
      include: {
        fieldValues: {
          include: {
            field: true, // Include the template field details
          },
        },
      },
    });

    if (!item) {
      throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
    }

    return item;
  }

  async getRecommendationsByTemplate(templateId: number): Promise<any[]> {
    // Validate template exists
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    // Dynamically fetch the poster field ID
    const posterField = await this.prisma.templateField.findFirst({
      where: {
        templateId,
        name: { contains: 'poster', mode: 'insensitive' },
      },
    });
    const posterFieldId = posterField?.id || null;

    // Fetch recent items for the template
    const items = await this.prisma.item.findMany({
      where: { templateId },
      include: {
        fieldValues: {
          where: posterFieldId ? { fieldId: posterFieldId } : undefined,
        },
        statistics: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Map to RecommendationItem format
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      poster:
        item.fieldValues[0]?.textValue || 'https://via.placeholder.com/150', // Fallback to placeholder
      createdAt: item.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
      avgRating: item.statistics?.avgRating
        ? Number(item.statistics.avgRating)
        : 0,
    }));
  }

  async getRecommendationsByGenre(
    templateId: number,
    templateFieldId: number,
    genreValues: string[],
  ): Promise<any[]> {
    // Validate template and field exist
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    const field = await this.prisma.templateField.findUnique({
      where: { id: templateFieldId },
    });
    if (!field || field.templateId !== templateId) {
      throw new HttpException(
        'Genre field not found or invalid for template',
        HttpStatus.NOT_FOUND,
      );
    }

    // Dynamically fetch the poster field ID
    const posterField = await this.prisma.templateField.findFirst({
      where: {
        templateId,
        name: { contains: 'poster', mode: 'insensitive' },
      },
    });
    const posterFieldId = posterField?.id || null;

    // Debug: Log genreValues and template/field IDs
    console.log('Debug - genreValues:', genreValues);
    console.log('Debug - templateId:', templateId);
    console.log('Debug - templateFieldId:', templateFieldId);
    console.log('Debug - posterFieldId:', posterFieldId);

    // Fetch all items with the given templateId and fieldValues
    const allItems = await this.prisma.item.findMany({
      where: { templateId },
      include: {
        fieldValues: true, // Include all field values to inspect
        statistics: true,
      },
    });

    // Debug: Log all fetched items
    console.log('Debug - All fetched items:', allItems);

    // Normalize genre values for comparison
    const normalizedGenreValues = genreValues.map((genre) =>
      genre.replace(/[\s-]/g, '').toLowerCase(),
    );

    // Filter items in memory by normalizing jsonValue
    const matchedItems = allItems
      .filter((item) => {
        const genreFieldValue = item.fieldValues.find(
          (fv) => fv.fieldId === templateFieldId,
        )?.jsonValue;
        console.log(
          'Debug - Item ID:',
          item.id,
          'Genre Field Value:',
          genreFieldValue,
        );
        if (!genreFieldValue || !Array.isArray(genreFieldValue)) return false;

        const normalizedItemGenres = genreFieldValue.map((genre: string) =>
          genre.replace(/[\s-]/g, '').toLowerCase(),
        );
        console.log('Debug - Normalized Item Genres:', normalizedItemGenres);
        return normalizedItemGenres.some((itemGenre) =>
          normalizedGenreValues.includes(itemGenre),
        );
      })
      .slice(0, 10); // Limit to 10 after filtering

    // Debug: Log matched items after filtering
    console.log('Debug - Matched items after filtering:', matchedItems);

    // Map to RecommendationItem format
    return matchedItems.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      poster:
        item.fieldValues.find((fv) => fv.fieldId === posterFieldId)
          ?.textValue || 'https://via.placeholder.com/150',
      createdAt: item.createdAt.toISOString().split('T')[0],
      avgRating: item.statistics?.avgRating
        ? Number(item.statistics.avgRating)
        : 0,
    }));
  }
}
