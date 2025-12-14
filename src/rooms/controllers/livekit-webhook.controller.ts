import { Body, Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';
import { ParticipantsService } from '../services/participants.service';
import { RoomsGateway } from '../ws/rooms.gateway';

@Controller('rooms/livekit')
export class LiveKitWebhookController {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    private readonly participantsService: ParticipantsService,
    private readonly roomsGateway: RoomsGateway,
  ) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    const event =
      (typeof body?.event === 'string' && body.event) ||
      (typeof body?.type === 'string' && body.type) ||
      (typeof body?.name === 'string' && body.name) ||
      '';

    if (event !== 'participant_left') {
      return { ok: true };
    }

    const livekitRoomName = body?.room?.name as string | undefined;
    const participantIdentity = body?.participant?.identity as
      | string
      | undefined;

    if (!livekitRoomName || !participantIdentity) {
      return { ok: true };
    }

    const room = await this.roomRepo.findOne({
      where: { livekitRoomName },
    });

    if (!room) {
      return { ok: true };
    }

    try {
      const changed = await this.participantsService.deactivateIfActive(
        room.id,
        participantIdentity,
      );

      if (changed) {
        await this.roomsGateway.broadcastParticipantsCount(room.id);
      }
    } catch {}

    return { ok: true };
  }
}
