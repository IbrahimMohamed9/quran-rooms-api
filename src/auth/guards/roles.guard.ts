import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { CustomLoggerService } from '../../logger/logger.service';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('RolesGuard');
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

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      this.logger.warn('User not found in request');
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
      const userPermissions = user.permissions || [];

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
      `User ${user.userId} attempted to access resource requiring roles: ${requiredRolesList} or permissions: ${requiredPermissionsList}`,
    );
    throw new ForbiddenException(`Access denied`);
  }
}
