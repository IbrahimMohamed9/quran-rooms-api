import Gender from '../types/gender';

/**
 * User Interface
 *
 * Defines the structure of a user entity without creating circular dependencies
 */
export interface IUser {
  id: number;
  name: string;
  email: string;
  password: string;
  country: string;
  roleId: number;
  phone: string;
  gender: Gender;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
