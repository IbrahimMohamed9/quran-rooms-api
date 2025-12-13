import { SetMetadata } from '@nestjs/common';

export const RequirePermission = (resource: string, action: string) =>
  SetMetadata('permissions', [resource, action]);
