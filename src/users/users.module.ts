import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { RolesModule } from '../roles/roles.module';
import { LoggerModule } from '../logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    FileUploadModule,
    forwardRef(() => RolesModule),
    LoggerModule,
    forwardRef(() => AuthModule),
    ConfigModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
