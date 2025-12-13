import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  RoomParticipant,
  ParticipantRole,
} from '../entities/room-participant.entity';
import { BlockedParticipant } from '../entities/blocked-participant.entity';
import { Room } from '../entities/room.entity';
import { RoomSettings } from '../entities/room-settings.entity';
import { LiveKitService } from './livekit.service';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(RoomParticipant)
    private participantRepo: Repository<RoomParticipant>,
    @InjectRepository(BlockedParticipant)
    private blockedRepo: Repository<BlockedParticipant>,
    @InjectRepository(Room)
    private roomRepo: Repository<Room>,
    @InjectRepository(RoomSettings)
    private settingsRepo: Repository<RoomSettings>,
    private liveKitService: LiveKitService,
  ) {}

  async joinRoom(
    roomId: number,
    userId: number,
  ): Promise<{ token: string; participant: RoomParticipant }> {
    const room = await this.roomRepo.findOne({
      where: { id: roomId, isActive: true },
      relations: ['settings', 'createdBy'],
    });

    if (!room) {
      throw new NotFoundException('Room not found or inactive');
    }

    const isBlocked = await this.blockedRepo.findOne({
      where: { roomId, userId },
    });

    if (isBlocked) {
      throw new ForbiddenException('You are blocked from this room');
    }

    const activeCount = await this.participantRepo.count({
      where: { roomId, leftAt: IsNull() },
    });

    if (activeCount >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    let participant = await this.participantRepo.findOne({
      where: { roomId, userId, leftAt: IsNull() },
      relations: ['user'],
    });

    if (participant) {
      throw new BadRequestException('You are already in this room');
    }

    const existingParticipant = await this.participantRepo.findOne({
      where: { roomId, userId },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });

    const isFirstParticipant = activeCount === 0;
    const participantRole = isFirstParticipant
      ? ParticipantRole.ADMIN
      : ParticipantRole.PARTICIPANT;

    participant = this.participantRepo.create({
      roomId,
      userId,
      participantRole,
      isMuted: room.settings?.defaultMutedOnJoin ?? false,
      mutedBy: room.settings?.defaultMutedOnJoin ? room.createdById : null,
    });

    await this.participantRepo.save(participant);

    participant = await this.participantRepo.findOne({
      where: { id: participant.id },
      relations: ['user'],
    });

    if (!participant) {
      throw new NotFoundException('Failed to retrieve participant');
    }

    const token = await this.liveKitService.generateToken(
      room.livekitRoomName,
      `user_${userId}`,
      participant.user.name,
      participantRole,
      participant.isMuted,
    );

    return { token, participant };
  }

  async leaveRoom(roomId: number, userId: number): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, userId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('You are not in this room');
    }

    await this.participantRepo.update(participant.id, {
      leftAt: new Date(),
    });

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (room) {
      try {
        await this.liveKitService.removeParticipant(
          room.livekitRoomName,
          `user_${userId}`,
        );
      } catch (error) {}
    }
  }

  async muteSelf(
    roomId: number,
    userId: number,
    muted: boolean,
  ): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, userId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('You are not in this room');
    }

    const settings = await this.settingsRepo.findOne({
      where: { roomId },
    });

    if (!settings) {
      throw new NotFoundException('Room settings not found');
    }

    if (!settings.allowMicControl && muted === false) {
      throw new ForbiddenException('You cannot unmute yourself in this room');
    }

    if (
      settings.onlyAdminCanUnmute &&
      participant.participantRole === ParticipantRole.PARTICIPANT &&
      muted === false
    ) {
      throw new ForbiddenException('Only admins can unmute in this room');
    }

    await this.participantRepo.update(participant.id, {
      isMuted: muted,
      mutedBy: muted ? userId : null,
    });

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (muted) {
      await this.liveKitService.muteParticipant(
        room.livekitRoomName,
        `user_${userId}`,
      );
    } else {
      await this.liveKitService.unmuteParticipant(
        room.livekitRoomName,
        `user_${userId}`,
      );
    }
  }
}
