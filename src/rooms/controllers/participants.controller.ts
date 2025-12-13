import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ParticipantsService } from '../services/participants.service';
import { MuteSelfDto } from '../dto/mute-self.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Users } from '../../users/entities/users.entity';

@ApiTags('participants')
@Controller('rooms/:roomId/participants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post('join')
  @ApiOperation({ summary: 'Join a room and get LiveKit token' })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined room, token returned',
  })
  async joinRoom(@Param('roomId') roomId: string, @CurrentUser() user: Users) {
    return this.participantsService.joinRoom(+roomId, user.id);
  }

  @Post('leave')
  @ApiOperation({ summary: 'Leave a room' })
  @ApiResponse({ status: 200, description: 'Successfully left room' })
  async leaveRoom(
    @Param('roomId') roomId: string,
    @CurrentUser() user: Users,
  ): Promise<{ message: string }> {
    await this.participantsService.leaveRoom(+roomId, user.id);
    return { message: 'Successfully left room' };
  }

  @Post('mute-self')
  @ApiOperation({ summary: 'Mute or unmute yourself' })
  @ApiResponse({ status: 200, description: 'Mute status updated' })
  async muteSelf(
    @Param('roomId') roomId: string,
    @Body() dto: MuteSelfDto,
    @CurrentUser() user: Users,
  ): Promise<{ message: string }> {
    await this.participantsService.muteSelf(+roomId, user.id, dto.muted);
    return { message: `Successfully ${dto.muted ? 'muted' : 'unmuted'}` };
  }
}
