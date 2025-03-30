import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TemplateDropdownDto } from './dto/template-dropdown.dto';

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  async getTemplatesForDropdown(): Promise<TemplateDropdownDto[]> {
    const templates = await this.prisma.template.findMany({
      where: { isPublished: true }, // Only include published templates
      select: {
        id: true,
        displayName: true,
      },
    });

    return templates.map((template) => ({
      value: template.id,
      label: template.displayName,
    }));
  }

  async getTemplateById(templateId: number) {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      include: {
        fields: {
          include: {
            dataSource: {
              include: {
                options: true, // Include data source options if any
              },
            },
          },
        },
      },
    });

    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    return template;
  }
}
