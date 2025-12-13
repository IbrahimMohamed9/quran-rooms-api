import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import Gender from '../types/gender';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'The unique identifier of the user' })
  id: number;

  @Column()
  @ApiProperty({ description: 'The name of the user' })
  name: string;

  @Column({ unique: true })
  @ApiProperty({ description: 'The email of the user' })
  email: string;

  @Column()
  @ApiProperty({ description: 'The country of the user' })
  country: string;

  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'role_id' })
  @ApiProperty({ description: 'The role of the user', type: () => Role })
  role: Role;

  @Column({ name: 'role_id', nullable: true })
  roleId: number;

  @Column({ select: false })
  password: string;

  @Column()
  @ApiProperty({ description: 'The phone number of the user' })
  phone: string;

  @Column({ type: 'enum', enum: Gender })
  @ApiProperty({
    description: 'The gender of the user',
    enum: Gender,
  })
  gender: string;

  @Column({ nullable: true })
  @ApiProperty({
    description: 'The profile image URL of the user',
    required: false,
  })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({ description: 'The creation date of the user record' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({ description: 'The last update date of the user record' })
  updatedAt: Date;
}
