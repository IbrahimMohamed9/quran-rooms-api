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

    const activeCount = await this.participantRepo.count({
      where: { roomId, leftAt: IsNull() },
    });

    if (activeCount >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    const participantRole = user
      ? user.id === room.createdById
        ? ParticipantRole.ADMIN
        : ParticipantRole.PARTICIPANT
      : ParticipantRole.PARTICIPANT;

    const participant = this.participantRepo.create({
      roomId,
      participantToken: userToken,
      participantName: userName,
      participantRole,
      isMuted: settings.defaultMutedOnJoin ?? false,
      mutedBy: settings.defaultMutedOnJoin ? room.createdById : null,
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
      savedParticipant.isMuted,
    );

    return { token, participant: savedParticipant };
  }

  async leaveRoom(roomId: number, userToken: string): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, participantToken: userToken, leftAt: IsNull() },
    });

    if (!participant) throw new NotFoundException('You are not in this room');

    await this.participantRepo.update(participant.id, { leftAt: new Date() });

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

  async muteSelf(
    roomId: number,
    userToken: string,
    muted: boolean,
  ): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, participantToken: userToken, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('You are not in this room');
    }

    const settings = await this.settingsRepo.findOne({ where: { roomId } });
    if (!settings) throw new NotFoundException('Room settings not found');

    // trying to UNMUTE
    if (muted === false) {
      if (!settings.allowMicControl) {
        throw new ForbiddenException('You cannot unmute yourself in this room');
      }

      if (
        settings.onlyAdminCanUnmute &&
        participant.participantRole === ParticipantRole.PARTICIPANT
      ) {
        throw new ForbiddenException('Only admins can unmute in this room');
      }
    }

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    // DB state first (source of truth for your API)
    await this.participantRepo.update(participant.id, {
      isMuted: muted,
      mutedBy: muted ? participant.id : null, // or null; set what you prefer
    });

    // LiveKit enforcement (permission + track mute if published)
    await this.liveKitService.setMicMuted(
      room.livekitRoomName,
      userToken,
      muted,
    );
  }
}
