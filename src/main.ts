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

  const config = new DocumentBuilder()
    .setTitle('Rating API')
    .setDescription('For Rating Website')
    .setVersion('1.0')
    .addTag('rating')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory);

  await app.listen(process.env.PORT ?? 8888);
}

bootstrap();
