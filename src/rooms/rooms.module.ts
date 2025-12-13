import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsController } from './controllers/rooms.controller';
import { ParticipantsController } from './controllers/participants.controller';
import { AdminController } from './controllers/admin.controller';
import { RoomsService } from './services/rooms.service';
import { ParticipantsService } from './services/participants.service';
import { AdminService } from './services/admin.service';
import { LiveKitService } from './services/livekit.service';
import { Room } from './entities/room.entity';
import { RoomSettings } from './entities/room-settings.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { BlockedParticipant } from './entities/blocked-participant.entity';
import { RoomAdminGuard } from './guards/room-admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Room,
      RoomSettings,
      RoomParticipant,
      BlockedParticipant,
    ]),
  ],
  controllers: [RoomsController, ParticipantsController, AdminController],
  providers: [
    RoomsService,
    ParticipantsService,
    AdminService,
    LiveKitService,
    RoomAdminGuard,
  ],
  exports: [RoomsService, LiveKitService],
})
export class RoomsModule {}
