import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

export const WEBSITE_URL = configService.get('WEBSITE_URL');

export const JWT_SECRET = configService.get('JWT_SECRET');

export const GOOGLE_CLIENT_ID = configService.get('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = configService.get('GOOGLE_CLIENT_SECRET');
export const GOOGLE_CALLBACK_URL = configService.get('GOOGLE_CALLBACK_URL');
