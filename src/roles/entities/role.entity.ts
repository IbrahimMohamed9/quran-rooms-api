import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('roles')
export class Role {
  @ApiProperty({ description: 'Unique identifier for the role', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Name of the role', example: 'Manager' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    description: 'Description of the role',
    example: 'Can manage users and orders',
    nullable: true,
  })
  @Column({ nullable: true })
  description: string;

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
  @Column('json')
  permissions: Record<string, string[]>;

  @ApiProperty({
    description: 'Date when the role was created',
    example: '2023-01-01T00:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
