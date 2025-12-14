import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ParticipantRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  PARTICIPANT = 'participant',
}

@Entity('room_participants')
export class RoomParticipant {
  @ApiProperty({ description: 'Unique identifier for the participant record' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID of the room' })
  @Column({ name: 'room_id' })
  roomId: number;

  @ApiProperty({ description: 'Token of the participant' })
  @Column({
    type: 'varchar',
    name: 'participant_token',
    length: 255,
  })
  token: string;

  @ApiProperty({ description: 'Whether the participant is currently active' })
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

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
  role: ParticipantRole;
}
