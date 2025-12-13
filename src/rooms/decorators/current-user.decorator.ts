import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Users } from '../../users/entities/users.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Users => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
