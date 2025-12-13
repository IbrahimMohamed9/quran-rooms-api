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

@Entity('blocked_participants')
@Unique(['roomId', 'userId'])
export class BlockedParticipant {
  @ApiProperty({ description: 'Unique identifier for the block record' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID of the room' })
  @Column({ name: 'room_id' })
  roomId: number;

  @ManyToOne(() => Room, (room) => room.blockedUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  @ApiProperty({
    description: 'The room where user is blocked',
    type: () => Room,
  })
  room: Room;

  @ApiProperty({ description: 'ID of the blocked user' })
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: 'The blocked user', type: () => Users })
  user: Users;

  @ApiProperty({ description: 'ID of user who blocked this participant' })
  @Column({ name: 'blocked_by_id' })
  blockedById: number;

  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'blocked_by_id' })
  @ApiProperty({
    description: 'User who performed the block',
    type: () => Users,
  })
  blockedBy: Users;

  @ApiProperty({
    description: 'Reason for blocking',
    example: 'Disruptive behavior',
    required: false,
  })
  @Column({ nullable: true, type: 'text' })
  reason: string;

  @ApiProperty({ description: 'When the user was blocked' })
  @CreateDateColumn({ name: 'blocked_at' })
  blockedAt: Date;
}
