import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from './email/email.module';
import { ItemModule } from './item/item.module';
import { TemplateModule } from './template/template.module';
import { DataSourceModule } from './data-source/data-source.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    EmailModule,
    ItemModule,
    TemplateModule,
    DataSourceModule,
  ],
  controllers: [AppController],
  providers: [PrismaService, AppService],
  exports: [PrismaService],
})
export class AppModule {}
