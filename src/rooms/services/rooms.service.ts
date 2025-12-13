import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Room } from '../entities/room.entity';
import { RoomSettings } from '../entities/room-settings.entity';
import { RoomParticipant } from '../entities/room-participant.entity';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { ListRoomsDto } from '../dto/list-rooms.dto';
import { LiveKitService } from './livekit.service';
import { AudioQuality } from '../entities/room-settings.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepo: Repository<Room>,
    @InjectRepository(RoomSettings)
    private settingsRepo: Repository<RoomSettings>,
    @InjectRepository(RoomParticipant)
    private participantRepo: Repository<RoomParticipant>,
    private liveKitService: LiveKitService,
  ) {}

  async createRoom(dto: CreateRoomDto, creatorId: number): Promise<Room> {
    const livekitRoomName = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room = this.roomRepo.create({
      name: dto.name,
      description: dto.description,
      livekitRoomName,
      maxParticipants: dto.maxParticipants || 50,
      requiresApproval: dto.requiresApproval || false,
      createdById: creatorId,
    });

    const savedRoom = await this.roomRepo.save(room);

    const settings = this.settingsRepo.create({
      roomId: savedRoom.id,
      allowMicControl: dto.settings?.allowMicControl ?? true,
      defaultMutedOnJoin: dto.settings?.defaultMutedOnJoin ?? false,
      onlyAdminCanUnmute: dto.settings?.onlyAdminCanUnmute ?? false,
      audioQuality: dto.settings?.audioQuality ?? AudioQuality.MEDIUM,
    });

    await this.settingsRepo.save(settings);

    return this.roomRepo.findOne({
      where: { id: savedRoom.id },
      relations: ['createdBy', 'settings'],
    });
  }

  async findAll(query: ListRoomsDto) {
    const { isActive, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.createdBy', 'createdBy')
      .leftJoinAndSelect('room.settings', 'settings');

    if (isActive !== undefined) {
      queryBuilder.andWhere('room.is_active = :isActive', { isActive });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('room.created_at', 'DESC')
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Room> {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: ['createdBy', 'settings', 'participants', 'participants.user'],
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async findOneOrFail(id: number): Promise<Room> {
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOneOrFail(id);

    if (dto.name !== undefined) room.name = dto.name;
    if (dto.description !== undefined) room.description = dto.description;
    if (dto.maxParticipants !== undefined)
      room.maxParticipants = dto.maxParticipants;
    if (dto.requiresApproval !== undefined)
      room.requiresApproval = dto.requiresApproval;

    await this.roomRepo.save(room);

    if (dto.settings) {
      const settings = await this.settingsRepo.findOne({
        where: { roomId: id },
      });
      if (settings) {
        if (dto.settings.allowMicControl !== undefined)
          settings.allowMicControl = dto.settings.allowMicControl;
        if (dto.settings.defaultMutedOnJoin !== undefined)
          settings.defaultMutedOnJoin = dto.settings.defaultMutedOnJoin;
        if (dto.settings.onlyAdminCanUnmute !== undefined)
          settings.onlyAdminCanUnmute = dto.settings.onlyAdminCanUnmute;
        if (dto.settings.audioQuality !== undefined)
          settings.audioQuality = dto.settings.audioQuality;
        await this.settingsRepo.save(settings);
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const room = await this.findOneOrFail(id);

    try {
      await this.liveKitService.deleteRoom(room.livekitRoomName);
    } catch (error) {}

    await this.roomRepo.remove(room);
  }

  async closeRoom(id: number): Promise<void> {
    const room = await this.findOneOrFail(id);

    try {
      await this.liveKitService.deleteRoom(room.livekitRoomName);
    } catch (error) {}

    await this.roomRepo.update(id, {
      isActive: false,
      closedAt: new Date(),
    });

    await this.participantRepo.update(
      { roomId: id, leftAt: IsNull() },
      { leftAt: new Date() },
    );
  }

  async getParticipants(id: number) {
    const room = await this.findOneOrFail(id);

    const participants = await this.participantRepo.find({
      where: { roomId: id, leftAt: IsNull() },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return participants;
  }
}
