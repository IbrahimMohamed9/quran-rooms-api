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

  async muteParticipant(
    roomId: number,
    targetUserId: number,
    adminUserId: number,
  ): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, userId: targetUserId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in room');
    }

    await this.participantRepo.update(participant.id, {
      isMuted: true,
      mutedBy: adminUserId,
    });

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.liveKitService.muteParticipant(
      room.livekitRoomName,
      `user_${targetUserId}`,
    );
  }

  async unmuteParticipant(roomId: number, targetUserId: number): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, userId: targetUserId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in room');
    }

    await this.participantRepo.update(participant.id, {
      isMuted: false,
      mutedBy: null,
    });

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.liveKitService.unmuteParticipant(
      room.livekitRoomName,
      `user_${targetUserId}`,
    );
  }

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

  async muteAll(roomId: number, excludeUserId?: number): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const updateQuery = this.participantRepo
      .createQueryBuilder()
      .update()
      .set({ isMuted: true, mutedBy: excludeUserId || null })
      .where('room_id = :roomId', { roomId })
      .andWhere('left_at IS NULL');

    if (excludeUserId) {
      updateQuery.andWhere('user_id != :excludeUserId', { excludeUserId });
    }

    await updateQuery.execute();

    await this.liveKitService.muteAllParticipants(
      room.livekitRoomName,
      excludeUserId ? `user_${excludeUserId}` : undefined,
    );
  }

  async unmuteAll(roomId: number): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    await this.participantRepo.update(
      { roomId, leftAt: IsNull() },
      { isMuted: false, mutedBy: null },
    );

    const participants = await this.participantRepo.find({
      where: { roomId, leftAt: IsNull() },
    });

    const unmutePromises = participants.map((p) =>
      this.liveKitService.unmuteParticipant(
        room.livekitRoomName,
        `user_${p.userId}`,
      ),
    );

    await Promise.all(unmutePromises);
  }
}
