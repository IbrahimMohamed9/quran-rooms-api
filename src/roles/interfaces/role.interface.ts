/**
 * Role Interface
 *
 * Defines the structure of a role entity without creating circular dependencies
 */
export interface IRole {
  id: number;
  name: string;
  description: string;
  permissions: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}
