// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConsoleLogger } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: new ConsoleLogger({
      prefix: 'RatingAPI',
      logLevels: ['error', 'warn', 'log', 'debug', 'verbose'],
    }),
  });

  // Apply the response interceptor globally
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Apply the global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors();

  // Get port from environment (Cloud Run sets PORT, fallback to 8080)
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Rating API')
    .setDescription('For Rating Website')
    .setVersion('1.0')
    .addTag('rating')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory);

  console.log(`🚀 RatingAPI starting on port ${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/swagger`);

  await app.listen(port);

  console.log('✅ RatingAPI is running and healthy!');
  console.log(`🔍 Health endpoint: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start RatingAPI:', error);
  process.exit(1);
});
