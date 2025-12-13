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

  private async ensureRoomSettings(roomId: number): Promise<RoomSettings> {
    let settings = await this.settingsRepo.findOne({ where: { roomId } });
    if (!settings) {
      settings = this.settingsRepo.create({ roomId });
      await this.settingsRepo.save(settings);
    }
    return settings;
  }

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

    let settings = room.settings;
    if (!settings) {
      settings = await this.ensureRoomSettings(roomId);
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

    const isFirstParticipant = activeCount === 0;
    const participantRole = isFirstParticipant
      ? ParticipantRole.ADMIN
      : ParticipantRole.PARTICIPANT;

    if (participant) {
      const now = new Date();
      await this.participantRepo.update(participant.id, {
        joinedAt: now,
        leftAt: now,
        isMuted: settings.defaultMutedOnJoin ?? false,
        mutedBy: settings.defaultMutedOnJoin ? room.createdById : null,
      });

      participant = await this.participantRepo.findOne({
        where: { id: participant.id },
        relations: ['user'],
      });
    } else {
      const existingParticipant = await this.participantRepo
        .createQueryBuilder('p')
        .where('p.roomId = :roomId AND p.userId = :userId', { roomId, userId })
        .leftJoinAndSelect('p.user', 'user')
        .orderBy('p.joinedAt', 'DESC')
        .getOne();

      if (existingParticipant) {
        await this.participantRepo.update(existingParticipant.id, {
          leftAt: undefined,
          participantRole,
          isMuted: settings.defaultMutedOnJoin ?? false,
          mutedBy: settings.defaultMutedOnJoin ? room.createdById : null,
        });

        participant = await this.participantRepo.findOne({
          where: { id: existingParticipant.id },
          relations: ['user'],
        });
      } else {
        participant = this.participantRepo.create({
          roomId,
          userId,
          participantRole,
          isMuted: settings.defaultMutedOnJoin ?? false,
          mutedBy: settings.defaultMutedOnJoin ? room.createdById : null,
        });

        await this.participantRepo.save(participant);

        participant = await this.participantRepo.findOne({
          where: { id: participant.id },
          relations: ['user'],
        });
      }
    }

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
