import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { LoggerModule } from '../logger/logger.module';
import { Role } from './entities/role.entity';
import { Users } from '../users/entities/users.entity';
import { PermissionsService } from './permissions.service';
import { RolesSeeder } from './roles.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Users]), LoggerModule],
  controllers: [RolesController],
  providers: [PermissionsService, RolesService, RolesSeeder],
  exports: [RolesService, PermissionsService],
})
export class RolesModule {}
