import { Body, Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';
import { ParticipantsService } from '../services/participants.service';
import { RoomsGateway } from '../ws/rooms.gateway';
import { CustomLoggerService } from '../../logger/logger.service';

@Controller('rooms/livekit')
export class LiveKitWebhookController {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    private readonly participantsService: ParticipantsService,
    private readonly roomsGateway: RoomsGateway,
    private readonly logger: CustomLoggerService,
  ) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    this.logger.setContext('LiveKitWebhookController');

    const payload =
      body?.event && typeof body.event === 'object' && body.event !== null
        ? body.event
        : body;

    const event =
      (typeof payload?.event === 'string' && payload.event) ||
      (typeof payload?.type === 'string' && payload.type) ||
      (typeof payload?.name === 'string' && payload.name) ||
      '';

    if (!event.endsWith('participant_left')) {
      return { ok: true };
    }

    const livekitRoomName =
      (payload?.room?.name as string | undefined) ||
      (payload?.room?.roomName as string | undefined) ||
      (payload?.room?.room_name as string | undefined);

    const participantIdentity =
      (payload?.participant?.identity as string | undefined) ||
      (payload?.participant?.participantIdentity as string | undefined) ||
      (payload?.participant?.participant_identity as string | undefined);

    if (!livekitRoomName || !participantIdentity) {
      this.logger.warn(
        `participant_left received but missing room/identity (room=${String(livekitRoomName)}, identity=${String(participantIdentity)})`,
      );
      return { ok: true };
    }

    this.logger.log(
      `participant_left received (room=${livekitRoomName}, identity=${participantIdentity})`,
    );

    const room = await this.roomRepo.findOne({
      where: { livekitRoomName },
    });

    if (!room) {
      this.logger.warn(
        `participant_left ignored: no Room found for livekitRoomName=${livekitRoomName}`,
      );
      return { ok: true };
    }

    try {
      const changed = await this.participantsService.deactivateIfActive(
        room.id,
        participantIdentity,
      );

      if (changed) {
        await this.roomsGateway.broadcastParticipantsCount(room.id);
        this.logger.log(
          `participant_left processed: deactivated and broadcasted (roomId=${room.id})`,
        );
      } else {
        this.logger.log(
          `participant_left processed: participant already inactive (roomId=${room.id})`,
        );
      }
    } catch (err) {
      this.logger.error(
        `participant_left failed (roomId=${room.id}, identity=${participantIdentity})`,
        err as any,
      );
    }

    return { ok: true };
  }
}
