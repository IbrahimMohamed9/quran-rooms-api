import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from 'livekit-server-sdk';
import { ParticipantRole } from '../entities/room-participant.entity';

@Injectable()
export class LiveKitService {
  private roomService: RoomServiceClient;
  private apiKey: string;
  private apiSecret: string;
  private wsUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('LIVEKIT_API_KEY') || '';
    this.apiSecret = this.configService.get('LIVEKIT_API_SECRET') || '';
    this.wsUrl = this.configService.get('LIVEKIT_URL') || '';

    this.roomService = new RoomServiceClient(
      this.wsUrl,
      this.apiKey,
      this.apiSecret,
    );
  }

  async generateToken(
    roomName: string,
    participantIdentity: string,
    participantName: string,
    role: ParticipantRole,
    isMuted: boolean = false,
  ): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantIdentity,
      name: participantName,
      metadata: JSON.stringify({ role, isMuted }),
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: [TrackSource.MICROPHONE],
    });

    return at.toJwt();
  }

  private async getMicTrackSid(
    roomName: string,
    identity: string,
  ): Promise<string | null> {
    const p = await this.roomService.getParticipant(roomName, identity);
    const micTrack = p.tracks?.find((t) => t.source === TrackSource.MICROPHONE);
    return micTrack?.sid ?? null;
  }

  async setMicMuted(roomName: string, identity: string, muted: boolean) {
    const micSid = await this.getMicTrackSid(roomName, identity);
    if (micSid) {
      await this.roomService.mutePublishedTrack(
        roomName,
        identity,
        micSid,
        muted,
      );
    }
  }

  async removeParticipant(roomName: string, participantIdentity: string) {
    await this.roomService.removeParticipant(roomName, participantIdentity);
  }

  async listParticipants(roomName: string) {
    return this.roomService.listParticipants(roomName);
  }

  async deleteRoom(roomName: string) {
    await this.roomService.deleteRoom(roomName);
  }

  async createLiveKitRoom(roomName: string, maxParticipants: number) {
    await this.roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants,
    });
  }
}
