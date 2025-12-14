import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Users } from '../../users/entities/users.entity';
import { RoomParticipant } from './room-participant.entity';
import { RoomSettings } from './room-settings.entity';

@Entity('rooms')
export class Room {
  @ApiProperty({ description: 'Unique identifier for the room' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Display name of the room',
    example: 'Team Meeting',
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Unique LiveKit room identifier',
    example: 'room_abc123',
  })
  @Column({ unique: true, name: 'livekit_room_name' })
  livekitRoomName: string;

  @ApiProperty({
    description: 'Room description',
    example: 'Weekly team sync',
    required: false,
  })
  @Column({ nullable: true, type: 'text' })
  description: string;

  @ApiProperty({
    description: 'Whether the room is currently active',
    example: true,
  })
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @ApiProperty({
    description: 'Maximum number of participants allowed',
    example: 50,
  })
  @Column({ default: 50, name: 'max_participants' })
  maxParticipants: number;

  @ApiProperty({
    description: 'Whether participants need approval to join',
    example: false,
  })
  @Column({ default: false, name: 'requires_approval' })
  requiresApproval: boolean;

  @ApiProperty({ description: 'ID of the user who created the room' })
  @Column({ name: 'created_by_id' })
  createdById: number;

  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  @ApiProperty({ description: 'User who created the room', type: () => Users })
  createdBy: Users;

  @ApiProperty({ description: 'When the room was created' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'When the room was closed', required: false })
  @Column({ nullable: true, name: 'closed_at' })
  closedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RoomParticipant, (participant) => participant.room)
  participants: RoomParticipant[];

  @OneToOne(() => RoomSettings, (settings) => settings.room, { cascade: true })
  settings: RoomSettings;
}
