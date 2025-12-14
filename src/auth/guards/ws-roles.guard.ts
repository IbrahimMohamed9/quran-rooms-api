import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { CustomLoggerService } from '../../logger/logger.service';

@Injectable()
export class WsRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('WsRolesGuard');
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const client: Socket = context.switchToWs().getClient();
    const user = client.data.user;
    const userPermissions = client.data.permissions || [];

    if (!user) {
      this.logger.warn('User not found in WebSocket client data');
      throw new ForbiddenException('Access denied');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const userRoleName = user.role?.name || '';
      const userRoles = user.roles || [];

      const hasRole = requiredRoles.some(
        (role) => userRoleName === role || userRoles.includes(role),
      );

      if (hasRole) {
        return true;
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );

      if (hasPermission) {
        return true;
      }
    }

    const requiredRolesList = requiredRoles ? requiredRoles.join(', ') : 'none';
    const requiredPermissionsList = requiredPermissions
      ? requiredPermissions.join(', ')
      : 'none';

    this.logger.warn(
      `User ${user.id} attempted to access WebSocket resource requiring roles: ${requiredRolesList} or permissions: ${requiredPermissionsList}`,
    );
    throw new ForbiddenException(`Access denied`);
  }
}
