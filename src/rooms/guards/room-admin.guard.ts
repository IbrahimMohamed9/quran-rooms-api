import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RoomParticipant,
  ParticipantRole,
} from '../entities/room-participant.entity';

@Injectable()
export class RoomAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(RoomParticipant)
    private participantRepo: Repository<RoomParticipant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const roomId = parseInt(request.params.id || request.params.roomId);

    if (!user || !roomId) {
      throw new ForbiddenException('Invalid request');
    }

    const hasSystemPermission =
      user.role?.permissions['rooms']?.includes('delete');
    if (hasSystemPermission) {
      return true;
    }

    const participant = await this.participantRepo.findOne({
      where: { roomId, userId: user.id },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    if (
      ![ParticipantRole.ADMIN, ParticipantRole.MODERATOR].includes(
        participant.participantRole,
      )
    ) {
      throw new ForbiddenException('You do not have admin rights in this room');
    }

    return true;
  }
}
