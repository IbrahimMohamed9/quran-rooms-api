import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoomsController } from './controllers/rooms.controller';
import { RoomsGateway } from './ws/rooms.gateway';
import { RoomsService } from './services/rooms.service';
import { ParticipantsService } from './services/participants.service';
import { AdminService } from './services/admin.service';
import { LiveKitService } from './services/livekit.service';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';
import { WsRolesGuard } from '../auth/guards/ws-roles.guard';
import { Room } from './entities/room.entity';
import { RoomSettings } from './entities/room-settings.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { Users } from '../users/entities/users.entity';
import { CustomLoggerService } from '../logger/logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomSettings, RoomParticipant, Users]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [RoomsController],
  providers: [
    RoomsGateway,
    RoomsService,
    ParticipantsService,
    AdminService,
    LiveKitService,
    WsJwtAuthGuard,
    WsRolesGuard,
    CustomLoggerService,
  ],
  exports: [RoomsService, LiveKitService],
})
export class RoomsModule {}
