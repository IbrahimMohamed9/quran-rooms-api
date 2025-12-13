import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
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

  generateToken(
    roomName: string,
    participantIdentity: string,
    participantName: string,
    role: ParticipantRole,
    isMuted: boolean = false,
  ): string {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantIdentity,
      name: participantName,
      metadata: JSON.stringify({ role, isMuted }),
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: !isMuted,
      canSubscribe: true,
      canPublishData: true,

      canPublishSources: ['microphone'],
    });

    return at.toJwt();
  }

  async muteParticipant(roomName: string, participantIdentity: string) {
    await this.roomService.mutePublishedTrack(
      roomName,
      participantIdentity,
      'microphone',
      true,
    );
  }

  async unmuteParticipant(roomName: string, participantIdentity: string) {
    await this.roomService.mutePublishedTrack(
      roomName,
      participantIdentity,
      'microphone',
      false,
    );
  }

  async removeParticipant(roomName: string, participantIdentity: string) {
    await this.roomService.removeParticipant(roomName, participantIdentity);
  }

  async getParticipants(roomName: string) {
    const participants = await this.roomService.listParticipants(roomName);
    return participants;
  }

  async deleteRoom(roomName: string) {
    await this.roomService.deleteRoom(roomName);
  }

  async muteAllParticipants(roomName: string, excludeIdentity?: string) {
    const participants = await this.getParticipants(roomName);

    const mutePromises = participants
      .filter((p) => p.identity !== excludeIdentity)
      .map((p) => this.muteParticipant(roomName, p.identity));

    await Promise.all(mutePromises);
  }
}
