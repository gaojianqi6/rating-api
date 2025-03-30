import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Item, TemplateField } from '@prisma/client';
import slugify from 'slugify';
import { CreateItemDto } from './dto/create-item.dto';

@Injectable()
export class ItemService {
  constructor(private prisma: PrismaService) {}

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

    // Validate field values against template fields
    const fieldValueMap = new Map<number, any>();
    for (const { fieldId, value } of fieldValues) {
      const field = templateFields.find((f) => f.id === fieldId);
      if (!field) {
        throw new HttpException(
          `Field with ID ${fieldId} not found in template`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (field.isRequired && (value === null || value === undefined)) {
        throw new HttpException(
          `Field ${field.name} is required`,
          HttpStatus.BAD_REQUEST,
        );
      }
      fieldValueMap.set(fieldId, value);
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
      const fieldValueData = fieldValues.map(({ fieldId, value }) => {
        const field = templateFields.find((f) => f.id === fieldId)!;
        const data: any = { itemId: item.id, fieldId };
        switch (field.fieldType.toLowerCase()) {
          case 'text':
            data.textValue = value;
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
          case 'json':
            data.jsonValue = value;
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
}
