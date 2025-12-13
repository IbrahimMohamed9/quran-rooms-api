import { Injectable, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { CustomLoggerService } from '../logger/logger.service';
import { PermissionsService } from './permissions.service';

@Injectable()
export class RolesSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly logger: CustomLoggerService,
    private readonly permissionsService: PermissionsService,
  ) {
    this.logger.setContext('RolesSeeder');
  }

  async onModuleInit() {
    await this.seedRoles();
  }

  private async seedRoles(): Promise<void> {
    try {
      const userRoleExists = await this.roleRepository.findOne({
        where: { name: 'User' },
      });

      const adminRoleExists = await this.roleRepository.findOne({
        where: { name: 'Admin' },
      });

      if (!userRoleExists) {
        await this.roleRepository.save({
          name: 'User',
          description: 'Regular user with no permissions',
          permissions: {},
        });
        this.logger.log('User role created with empty permissions');
      }

      if (!adminRoleExists) {
        const adminPermissions = this.permissionsService.getAdminPermissions();
        await this.roleRepository.save({
          name: 'Admin',
          description: 'Administrator with full permissions',
          permissions: adminPermissions,
        });
        this.logger.log('Admin role created with full permissions');
      }
    } catch (error) {
      this.logger.error(
        `Failed to seed roles: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
