import { Request } from 'express';

export interface UserPayload {
  id: number;
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
