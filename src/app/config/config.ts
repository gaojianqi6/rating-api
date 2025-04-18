/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

export const WEBSITE_URL = configService.get('WEBSITE_URL');

export const JWT_SECRET = configService.get('JWT_SECRET');

export const GOOGLE_CLIENT_ID = configService.get('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = configService.get('GOOGLE_CLIENT_SECRET');
export const GOOGLE_CALLBACK_URL = configService.get('GOOGLE_CALLBACK_URL');

export const AWS_ACCESS_KEY_ID = configService.get('AWS_ACCESS_KEY_ID');
export const AWS_SECRET_ACCESS_KEY = configService.get('AWS_SECRET_ACCESS_KEY');
export const AWS_REGION = configService.get('AWS_REGION');
export const S3_BUCKET = configService.get('S3_BUCKET');
