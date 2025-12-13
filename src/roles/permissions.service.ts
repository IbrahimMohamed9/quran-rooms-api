import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private availablePermissions: Record<string, string[]> = {};

  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('PermissionsService');
  }

  onModuleInit() {
    this.loadPermissions();
  }

  private loadPermissions(): void {
    try {
      const permissionsPath = path.join(process.cwd(), 'permissions.json');
      const permissionsData = fs.readFileSync(permissionsPath, 'utf8');
      this.availablePermissions = JSON.parse(permissionsData) as Record<
        string,
        string[]
      >;
      this.logger.log(
        'Permissions loaded successfully from: ' + permissionsPath,
      );
    } catch (error) {
      this.logger.error(
        `Failed to load permissions file: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.availablePermissions = {
        users: ['create', 'read', 'update', 'delete'],
        roles: ['read', 'create', 'update', 'delete'],
        rooms: ['create', 'read', 'update', 'delete'],
      };
      this.logger.log(
        'Using full permissions list as fallback due to file loading error',
      );
    }
  }

  getAvailablePermissions(): Record<string, string[]> {
    return this.availablePermissions;
  }

  getUserPermissions(): Record<string, string[]> {
    return {};
  }

  getAdminPermissions(): Record<string, string[]> {
    return this.availablePermissions;
  }

  validatePermissions(permissions: Record<string, string[]>): boolean {
    for (const resource in permissions) {
      if (!this.availablePermissions[resource]) {
        this.logger.warn(`Invalid resource in permissions: ${resource}`);
        return false;
      }

      const actions = permissions[resource];
      for (const action of actions) {
        if (!this.availablePermissions[resource].includes(action)) {
          this.logger.warn(
            `Invalid action '${action}' for resource '${resource}'`,
          );
          return false;
        }
      }
    }
    return true;
  }
}
