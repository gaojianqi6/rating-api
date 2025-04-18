import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  S3_BUCKET,
} from '@/app/config/config';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = S3_BUCKET;
  }

  async generatePresignedUrl(
    filename: string,
    contentType: string,
    type: string,
  ): Promise<{ presignedUrl: string; publicUrl: string }> {
    this.logger.log(
      `Generating pre-signed URL for filename: ${filename}, contentType: ${contentType}`,
    );
    // Validate filename
    if (!filename || typeof filename !== 'string') {
      this.logger.error('Filename is missing or invalid');
      throw new HttpException(
        'Filename must be a non-empty string',
        HttpStatus.BAD_REQUEST,
      );
    }
    const extMatch = filename.match(/\.(jpg|jpeg|png)$/i);
    if (!extMatch) {
      this.logger.error(`Invalid filename extension: ${filename}`);
      throw new HttpException(
        'Filename must end with .jpg, .jpeg, or .png',
        HttpStatus.BAD_REQUEST,
      );
    }
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_\.]/g, ''); // Remove special chars
    const uuid = uuidv4();
    const objectKey = `${type}/${uuid}/${sanitizedFilename}`;
    this.logger.log(`Generated object key: ${objectKey}`);

    // Generate pre-signed URL
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    try {
      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300, // 5 minutes
      });
      const publicUrl = `https://${this.bucketName}.s3.amazonaws.com/${objectKey}`;
      this.logger.log(`Pre-signed URL generated: ${publicUrl}`);
      return { presignedUrl, publicUrl };
    } catch (error) {
      this.logger.error(`Failed to generate pre-signed URL: ${error.message}`);
      throw new HttpException(
        `Failed to generate pre-signed URL: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
