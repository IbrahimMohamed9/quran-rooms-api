import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RoleResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier for the role',
    example: 1,
  })
  id: number;

  @Expose()
  @ApiProperty({
    description: 'Name of the role',
    example: 'Manager',
  })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Description of the role',
    example: 'Can manage users and orders',
    nullable: true,
  })
  description: string;

  @Expose()
  @ApiProperty({
    description:
      'Permissions for this role as a map of resource names to allowed actions',
    example: {
      users: ['create', 'read', 'update'],
      orders: ['read', 'update'],
    },
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  })
  permissions: Record<string, string[]>;

  @Expose()
  @ApiProperty({
    description: 'Date when the role was created',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Date when the role was last updated',
    example: '2023-01-01T00:00:00Z',
  })
  updatedAt: Date;
}
