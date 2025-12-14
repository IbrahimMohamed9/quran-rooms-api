import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RoomParticipant,
  ParticipantRole,
} from '../entities/room-participant.entity';
import { Room } from '../entities/room.entity';
import { RoomSettings } from '../entities/room-settings.entity';
import { LiveKitService } from './livekit.service';
import { Users } from 'src/users/entities/users.entity';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(RoomParticipant)
    private participantRepo: Repository<RoomParticipant>,
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
    userToken: string,
    userName: string,
    user?: Users,
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

    const existingParticipant = await this.participantRepo.findOne({
      where: { roomId, token: userToken },
    });

    const activeCount = await this.participantRepo.count({
      where: { roomId, isActive: true },
    });

    const userParticipantPermissions = user?.role?.permissions?.participants;
    const hasParticipantsModerationPermission = Array.isArray(
      userParticipantPermissions,
    )
      ? userParticipantPermissions.some((p) => ['manage'].includes(p))
      : false;

    const participantRole = hasParticipantsModerationPermission
      ? ParticipantRole.ADMIN
      : ParticipantRole.PARTICIPANT;

    if (existingParticipant) {
      if (!existingParticipant.isActive) {
        if (activeCount >= room.maxParticipants) {
          throw new BadRequestException('Room is full');
        }
        existingParticipant.isActive = true;
      }
      existingParticipant.role = participantRole;
      await this.participantRepo.save(existingParticipant);

      const token = await this.liveKitService.generateToken(
        room.livekitRoomName,
        userToken,
        userName,
        participantRole,
      );

      return { token, participant: existingParticipant };
    }

    if (activeCount >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    const participant = this.participantRepo.create({
      roomId,
      token: userToken,
      role: participantRole,
      isActive: true,
    });

    await this.participantRepo.save(participant);

    const savedParticipant = await this.participantRepo.findOne({
      where: { id: participant.id },
    });

    if (!savedParticipant) {
      throw new NotFoundException('Failed to retrieve participant');
    }

    const token = await this.liveKitService.generateToken(
      room.livekitRoomName,
      userToken,
      userName,
      participantRole,
    );

    return { token, participant: savedParticipant };
  }

  async leaveRoom(roomId: number, userToken: string): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, token: userToken, isActive: true },
    });

    if (!participant) throw new NotFoundException('You are not in this room');

    participant.isActive = false;
    await this.participantRepo.save(participant);

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (room) {
      try {
        await this.liveKitService.removeParticipant(
          room.livekitRoomName,
          userToken,
        );
      } catch {}
    }
  }

  async deactivateIfActive(
    roomId: number,
    userToken: string,
  ): Promise<boolean> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, token: userToken, isActive: true },
    });

    if (!participant) return false;

    participant.isActive = false;
    await this.participantRepo.save(participant);
    return true;
  }

  async deactivateAllActiveByToken(userToken: string): Promise<number[]> {
    const activeParticipants = await this.participantRepo.find({
      where: { token: userToken, isActive: true },
    });

    if (activeParticipants.length === 0) return [];

    for (const participant of activeParticipants) {
      participant.isActive = false;
    }

    await this.participantRepo.save(activeParticipants);

    return Array.from(new Set(activeParticipants.map((p) => p.roomId)));
  }

  async muteAll(roomId: number, muted: boolean): Promise<number> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const participants = await this.participantRepo.find({
      where: { roomId, isActive: true },
      order: { id: 'ASC' },
    });

    await Promise.all(
      participants.map(async (p) => {
        try {
          await this.liveKitService.setMicMuted(
            room.livekitRoomName,
            p.token,
            muted,
          );
        } catch {}
      }),
    );

    return participants.length;
  }

  async muteParticipant(
    roomId: number,
    targetToken: string,
    muted: boolean,
  ): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const participant = await this.participantRepo.findOne({
      where: { roomId, token: targetToken, isActive: true },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in room');
    }

    await this.liveKitService.setMicMuted(
      room.livekitRoomName,
      targetToken,
      muted,
    );
  }

  async muteSelf(
    roomId: number,
    userToken: string,
    muted: boolean,
  ): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, token: userToken, isActive: true },
    });

    if (!participant) {
      throw new NotFoundException('You are not in this room');
    }

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    // LiveKit enforcement (permission + track mute if published)
    await this.liveKitService.setMicMuted(
      room.livekitRoomName,
      userToken,
      muted,
    );
  }
}
