import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Room } from './room.entity';
import { Users } from '../../users/entities/users.entity';

export enum ParticipantRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  PARTICIPANT = 'participant',
}

@Entity('room_participants')
@Unique(['roomId', 'userId'])
export class RoomParticipant {
  @ApiProperty({ description: 'Unique identifier for the participant record' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID of the room' })
  @Column({ name: 'room_id' })
  roomId: number;

  @ManyToOne(() => Room, (room) => room.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  @ApiProperty({
    description: 'The room this participant is in',
    type: () => Room,
  })
  room: Room;

  @ApiProperty({ description: 'ID of the user' })
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: 'The user participating', type: () => Users })
  user: Users;

  @ApiProperty({
    description: 'Role of the participant in this room',
    enum: ParticipantRole,
    example: ParticipantRole.PARTICIPANT,
  })
  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.PARTICIPANT,
    name: 'participant_role',
  })
  participantRole: ParticipantRole;

  @ApiProperty({
    description: 'Whether the participant is currently muted',
    example: false,
  })
  @Column({ default: false, name: 'is_muted' })
  isMuted: boolean;

  @ApiProperty({
    description: 'ID of user who muted this participant (null if self-muted)',
    required: false,
  })
  @Column({ type: 'int', nullable: true, name: 'muted_by' })
  mutedBy: number | null;

  @ApiProperty({ description: 'When the participant joined' })
  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @ApiProperty({
    description: 'When the participant left',
    required: false,
  })
  @Column({ nullable: true, name: 'left_at' })
  leftAt: Date;
}
