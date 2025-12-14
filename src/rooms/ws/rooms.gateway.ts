import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { RoomsService } from '../services/rooms.service';
import { ParticipantsService } from '../services/participants.service';
import { AdminService } from '../services/admin.service';
import { WsJwtAuthGuard } from '../../auth/guards/ws-jwt-auth.guard';
import { WsRolesGuard } from '../../auth/guards/ws-roles.guard';
import { RequirePermissions } from '../../auth/decorators/roles.decorator';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { ListRoomsDto } from '../dto/list-rooms.dto';
import { UserTokenDto } from '../dto/user-token.dto';
import { MuteSelfDto } from '../dto/mute-self.dto';
import { CustomLoggerService } from '../../logger/logger.service';

@WebSocketGateway({ namespace: '/rooms', cors: true })
export class RoomsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly participantsService: ParticipantsService,
    private readonly adminService: AdminService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('RoomsGateway');
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  private async getRoomSocketCount(roomId: number): Promise<number> {
    const room = await this.roomsService.getParticipants(roomId);
    return room.length;
  }

  private async broadcastRoomParticipantsCount(roomId: number) {
    const count = await this.getRoomSocketCount(roomId);
    // Broadcast to clients inside the room as well as global listeners (lists/dashboards)
    this.server.to(`room:${roomId}`).emit('room:participantsCountChanged', {
      roomId,
      count,
    });
    this.server.emit('room:participantsCountChanged', { roomId, count });
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const handshakeUserToken = client.handshake.auth?.userToken as
      | string
      | undefined;

    if (handshakeUserToken) {
      client.data.userToken = handshakeUserToken;
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const userToken =
      (client.data?.userToken as string | undefined) ||
      (client.handshake.auth?.userToken as string | undefined);

    if (!userToken) return;

    try {
      const affectedRoomIds =
        await this.participantsService.deactivateAllActiveByToken(userToken);

      for (const roomId of affectedRoomIds) {
        await this.broadcastRoomParticipantsCount(roomId);
      }
    } catch {}
  }

  @SubscribeMessage('room:list')
  async handleRoomList(
    @MessageBody() data: ListRoomsDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const rooms = await this.roomsService.findAll(data || {});

      // roomsService.findAll returns a paged object: { items, total, ... }
      const items = Array.isArray((rooms as any)?.items)
        ? (rooms as any).items
        : [];

      const itemsWithCounts = await Promise.all(
        items.map(async (r: any) => ({
          ...r,
          participantsCount: await this.getRoomSocketCount(r.id),
        })),
      );

      return {
        ok: true,
        data: {
          ...(rooms as any),
          items: itemsWithCounts,
        },
      };
    } catch (error) {
      this.logger.error('Error listing rooms', error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('room:get')
  async handleRoomGet(
    @MessageBody() data: { id: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.roomsService.findOne(data.id);
      const participantsCount = await this.getRoomSocketCount(data.id);
      return {
        ok: true,
        data: {
          ...(room as any),
          participantsCount,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting room ${data.id}`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('room:update')
  @UseGuards(WsJwtAuthGuard, WsRolesGuard)
  @RequirePermissions('rooms', 'update')
  async handleRoomUpdate(
    @MessageBody() data: { id: number; dto: UpdateRoomDto },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.roomsService.update(data.id, data.dto);
      this.server.to(`room:${data.id}`).emit('room:updated', room);
      return { ok: true, data: room };
    } catch (error) {
      this.logger.error(`Error updating room ${data.id}`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('room:delete')
  @UseGuards(WsJwtAuthGuard, WsRolesGuard)
  @RequirePermissions('rooms', 'delete')
  async handleRoomDelete(
    @MessageBody() data: { id: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.roomsService.remove(data.id);
      this.server.to(`room:${data.id}`).emit('room:deleted', { id: data.id });
      return { ok: true, message: 'Room deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting room ${data.id}`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('room:close')
  @UseGuards(WsJwtAuthGuard, WsRolesGuard)
  @RequirePermissions('rooms', 'close')
  async handleRoomClose(
    @MessageBody() data: { id: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.roomsService.closeRoom(data.id);
      this.server.to(`room:${data.id}`).emit('room:closed', { id: data.id });
      return { ok: true, message: 'Room closed successfully' };
    } catch (error) {
      this.logger.error(`Error closing room ${data.id}`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('room:participants')
  async handleRoomParticipants(
    @MessageBody() data: { id: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const participants = await this.roomsService.getParticipants(data.id);
      return { ok: true, data: participants };
    } catch (error) {
      this.logger.error(
        `Error getting participants for room ${data.id}`,
        error,
      );
      return { ok: false, error: error.message };
    }
  }

  // Participant Events

  @SubscribeMessage('participant:join')
  @UseGuards(WsJwtAuthGuard)
  async handleParticipantJoin(
    @MessageBody() data: { roomId: number } & UserTokenDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = client.data.user;
      const userToken =
        data.token ||
        (client.data?.userToken as string | undefined) ||
        (client.handshake.auth?.userToken as string | undefined);

      if (!userToken) {
        throw new BadRequestException('Missing user token');
      }
      const result = await this.participantsService.joinRoom(
        data.roomId,
        userToken,
        data.name,
        user,
      );

      // Join the room channel
      client.join(`room:${data.roomId}`);
      client.data.joinedRoomId = data.roomId;

      // Notify other participants
      const participantsCount = await this.getRoomSocketCount(data.roomId);
      this.server.to(`room:${data.roomId}`).emit('room:participantsUpdated', {
        roomId: data.roomId,
        participant: result.participant,
        action: 'joined',
        participantsCount,
      });

      await this.broadcastRoomParticipantsCount(data.roomId);

      return { ok: true, data: result };
    } catch (error) {
      this.logger.error(`Error joining room ${data.roomId}`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('participant:joinGuest')
  async handleParticipantJoinGuest(
    @MessageBody() data: { roomId: number } & UserTokenDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userToken =
        data.token ||
        (client.data?.userToken as string | undefined) ||
        (client.handshake.auth?.userToken as string | undefined);

      if (!userToken) {
        throw new BadRequestException('Missing user token');
      }
      const result = await this.participantsService.joinRoom(
        data.roomId,
        userToken,
        data.name,
      );

      // Join the room channel
      client.join(`room:${data.roomId}`);

      // Notify other participants
      this.server.to(`room:${data.roomId}`).emit('room:participantsUpdated', {
        roomId: data.roomId,
        participant: result.participant,
        action: 'joined',
      });

      return { ok: true, data: result };
    } catch (error) {
      this.logger.error(`Error joining room ${data.roomId} as guest`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('participant:leave')
  async handleParticipantLeave(
    @MessageBody() data: { roomId: number } & UserTokenDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userToken =
        data.token ||
        (client.data?.userToken as string | undefined) ||
        (client.handshake.auth?.userToken as string | undefined);

      if (!userToken) {
        throw new BadRequestException('Missing user token');
      }

      await this.participantsService.leaveRoom(data.roomId, userToken);

      // Leave the room channel
      client.leave(`room:${data.roomId}`);
      client.data.joinedRoomId = undefined;

      // Notify other participants
      const participantsCount = await this.getRoomSocketCount(data.roomId);
      this.server.to(`room:${data.roomId}`).emit('room:participantsUpdated', {
        roomId: data.roomId,
        userToken,
        action: 'left',
        participantsCount,
      });

      await this.broadcastRoomParticipantsCount(data.roomId);

      return { ok: true, message: 'Successfully left room' };
    } catch (error) {
      this.logger.error(`Error leaving room ${data.roomId}`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('participant:muteSelf')
  async handleParticipantMuteSelf(
    @MessageBody() data: { roomId: number } & MuteSelfDto & UserTokenDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userToken =
        data.token ||
        (client.data?.userToken as string | undefined) ||
        (client.handshake.auth?.userToken as string | undefined);

      if (!userToken) {
        throw new BadRequestException('Missing user token');
      }

      await this.participantsService.muteSelf(
        data.roomId,
        userToken,
        data.muted,
      );

      // Notify other participants
      this.server
        .to(`room:${data.roomId}`)
        .emit('room:participantMutedChanged', {
          roomId: data.roomId,
          userToken,
          muted: data.muted,
        });

      return {
        ok: true,
        message: `Successfully ${data.muted ? 'muted' : 'unmuted'}`,
      };
    } catch (error) {
      this.logger.error(`Error muting/unmuting in room ${data.roomId}`, error);
      return { ok: false, error: error.message };
    }
  }

  // Admin Events

  @SubscribeMessage('admin:muteAll')
  @UseGuards(WsJwtAuthGuard, WsRolesGuard)
  @RequirePermissions('participants', 'mute')
  async handleAdminMuteAll(
    @MessageBody() data: { roomId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const mutedCount = await this.participantsService.muteAll(
        data.roomId,
        true,
      );

      this.server.to(`room:${data.roomId}`).emit('room:muteAllChanged', {
        roomId: data.roomId,
        muted: true,
      });

      return { ok: true, data: { roomId: data.roomId, mutedCount } };
    } catch (error) {
      this.logger.error(`Error muting all in room ${data.roomId}`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('admin:unmuteAll')
  @UseGuards(WsJwtAuthGuard, WsRolesGuard)
  @RequirePermissions('participants', 'unmute')
  async handleAdminUnmuteAll(
    @MessageBody() data: { roomId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const mutedCount = await this.participantsService.muteAll(
        data.roomId,
        false,
      );

      this.server.to(`room:${data.roomId}`).emit('room:muteAllChanged', {
        roomId: data.roomId,
        muted: false,
      });

      return { ok: true, data: { roomId: data.roomId, mutedCount } };
    } catch (error) {
      this.logger.error(`Error unmuting all in room ${data.roomId}`, error);
      return { ok: false, error: error.message };
    }
  }

  @SubscribeMessage('admin:kickParticipant')
  @UseGuards(WsJwtAuthGuard, WsRolesGuard)
  @RequirePermissions('participants', 'kick')
  async handleAdminKickParticipant(
    @MessageBody() data: { roomId: number; token: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.adminService.kickParticipant(data.roomId, data.token);

      // Notify all participants including the kicked one
      const participantsCount = await this.getRoomSocketCount(data.roomId);
      this.server.to(`room:${data.roomId}`).emit('room:participantsUpdated', {
        roomId: data.roomId,
        userToken: data.token,
        action: 'kicked',
        participantsCount,
      });

      await this.broadcastRoomParticipantsCount(data.roomId);

      return {
        ok: true,
        message: 'Participant kicked successfully',
        participantsCount,
      };
    } catch (error) {
      this.logger.error(
        `Error kicking participant from room ${data.roomId}`,
        error,
      );
      return { ok: false, error: error.message };
    }
  }
}
