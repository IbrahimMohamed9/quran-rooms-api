import { Request } from 'express';

export interface UserPayload {
  userId: number;
  email: string;
  roles: string[];
  permissions?: string[];
  role?: {
    name: string;
    [key: string]: any;
  };
}

export interface RequestWithUser extends Request {
  user: UserPayload;
}
