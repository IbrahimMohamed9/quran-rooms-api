import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Room } from './room.entity';

export enum AudioQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('room_settings')
export class RoomSettings {
  @ApiProperty({ description: 'Unique identifier for room settings' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID of the room these settings belong to' })
  @Column({ name: 'room_id', unique: true })
  roomId: number;

  @OneToOne(() => Room, (room) => room.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ApiProperty({
    description: 'Whether participants can control their own mic',
    example: true,
  })
  @Column({ default: true, name: 'allow_mic_control' })
  allowMicControl: boolean;

  @ApiProperty({
    description: 'Whether participants join muted by default',
    example: false,
  })
  @Column({ default: false, name: 'default_muted_on_join' })
  defaultMutedOnJoin: boolean;

  @ApiProperty({
    description: 'Whether only admins can unmute participants',
    example: false,
  })
  @Column({ default: false, name: 'only_admin_can_unmute' })
  onlyAdminCanUnmute: boolean;

  @ApiProperty({
    description: 'Audio quality setting for the room',
    enum: AudioQuality,
    example: AudioQuality.MEDIUM,
  })
  @Column({
    type: 'enum',
    enum: AudioQuality,
    default: AudioQuality.MEDIUM,
    name: 'audio_quality',
  })
  audioQuality: AudioQuality;
}
