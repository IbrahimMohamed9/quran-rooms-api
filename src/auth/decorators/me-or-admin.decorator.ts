import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

/**
 * Custom decorator that checks if the current user is either an admin or the user being accessed
 * Usage: @MeOrAdminOrAuthorized() userId: number
 */
export const MeOrAdminOrAuthorized = createParamDecorator(
  (data: string, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const userId = parseInt(request.params.userId, 10);

    if (
      user.role?.name === 'admin' ||
      Number(user.userId) === userId ||
      user.permissions?.includes(data)
    ) {
      return userId;
    }

    throw new ForbiddenException('Access denied');
  },
);
