import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Users } from '../../users/entities/users.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: Users = request.user;

    if (!user || !user.role) {
      return false;
    }

    const [resource, action] = requiredPermissions;
    const rolePermissions = user.role.permissions[resource] || [];

    return rolePermissions.includes(action);
  }
}
