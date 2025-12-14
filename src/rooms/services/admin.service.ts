import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomParticipant } from '../entities/room-participant.entity';
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

  async kickParticipant(roomId: number, targetToken: string): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, token: targetToken },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in room');
    }

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    await this.participantRepo.delete(participant.id);

    await this.liveKitService.removeParticipant(
      room.livekitRoomName,
      targetToken,
    );
  }
}
