import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({ summary: 'Generate a pre-signed URL for S3 upload' })
  @ApiBody({ type: PresignedUrlDto })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed URL and public URL generated successfully',
    type: Object,
  })
  @Post('presigned-url')
  async generatePresignedUrl(@Body() dto: PresignedUrlDto, @Req() req) {
    return this.uploadService.generatePresignedUrl(
      dto.filename,
      dto.contentType,
      dto.type,
    );
  }
}
