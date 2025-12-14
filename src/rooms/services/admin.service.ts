import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  RoomParticipant,
  ParticipantRole,
} from '../entities/room-participant.entity';
import { Room } from '../entities/room.entity';
import { LiveKitService } from './livekit.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(RoomParticipant)
    private participantRepo: Repository<RoomParticipant>,
    @InjectRepository(Room)
    private roomRepo: Repository<Room>,
    private liveKitService: LiveKitService,
  ) {}

  async kickParticipant(roomId: number, targetUserId: number): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, userId: targetUserId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in room');
    }

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.createdById === targetUserId) {
      throw new BadRequestException('Cannot kick room creator');
    }

    await this.participantRepo.update(participant.id, {
      leftAt: new Date(),
    });

    await this.liveKitService.removeParticipant(
      room.livekitRoomName,
      `user_${targetUserId}`,
    );
  }
}
