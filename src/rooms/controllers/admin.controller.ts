import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { BlockParticipantDto } from '../dto/block-participant.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoomAdminGuard } from '../guards/room-admin.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Users } from '../../users/entities/users.entity';
import { RequirePermissions } from 'src/auth/decorators/roles.decorator';

@ApiTags('room-admin')
@Controller('rooms/:roomId/admin')
@UseGuards(JwtAuthGuard, RoomAdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('participants/:userId/mute')
  @RequirePermissions('participants', 'mute')
  @ApiOperation({ summary: 'Mute a participant' })
  @ApiResponse({ status: 200, description: 'Participant muted successfully' })
  async muteParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: Users,
  ): Promise<{ message: string }> {
    await this.adminService.muteParticipant(+roomId, +userId, user.id);
    return { message: 'Participant muted successfully' };
  }

  @Post('participants/:userId/unmute')
  @RequirePermissions('participants', 'unmute')
  @ApiOperation({ summary: 'Unmute a participant' })
  @ApiResponse({ status: 200, description: 'Participant unmuted successfully' })
  async unmuteParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.adminService.unmuteParticipant(+roomId, +userId);
    return { message: 'Participant unmuted successfully' };
  }

  @Post('participants/:userId/kick')
  @RequirePermissions('participants', 'kick')
  @ApiOperation({ summary: 'Kick a participant from the room' })
  @ApiResponse({ status: 200, description: 'Participant kicked successfully' })
  async kickParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.adminService.kickParticipant(+roomId, +userId);
    return { message: 'Participant kicked successfully' };
  }

  @Post('participants/:userId/block')
  @RequirePermissions('participants', 'block')
  @ApiOperation({ summary: 'Block a participant from the room' })
  @ApiResponse({ status: 200, description: 'Participant blocked successfully' })
  async blockParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body() dto: BlockParticipantDto,
    @CurrentUser() user: Users,
  ): Promise<{ message: string }> {
    await this.adminService.blockParticipant(
      +roomId,
      +userId,
      user.id,
      dto.reason,
    );
    return { message: 'Participant blocked successfully' };
  }

  @Delete('participants/:userId/block')
  @RequirePermissions('participants', 'block')
  @ApiOperation({ summary: 'Unblock a participant' })
  @ApiResponse({
    status: 200,
    description: 'Participant unblocked successfully',
  })
  async unblockParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.adminService.unblockParticipant(+roomId, +userId);
    return { message: 'Participant unblocked successfully' };
  }

  @Post('participants/:userId/promote')
  @RequirePermissions('participants', 'promote')
  @ApiOperation({ summary: 'Promote participant to moderator' })
  @ApiResponse({
    status: 200,
    description: 'Participant promoted successfully',
  })
  async promoteToModerator(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.adminService.promoteToModerator(+roomId, +userId);
    return { message: 'Participant promoted to moderator' };
  }

  @Post('participants/:userId/demote')
  @RequirePermissions('participants', 'promote')
  @ApiOperation({ summary: 'Demote moderator to participant' })
  @ApiResponse({ status: 200, description: 'Participant demoted successfully' })
  async demoteToParticipant(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.adminService.demoteToParticipant(+roomId, +userId);
    return { message: 'Participant demoted to participant' };
  }

  @Post('mute-all')
  @RequirePermissions('participants', 'mute')
  @ApiOperation({ summary: 'Mute all participants except yourself' })
  @ApiResponse({ status: 200, description: 'All participants muted' })
  async muteAllParticipants(
    @Param('roomId') roomId: string,
    @CurrentUser() user: Users,
  ): Promise<{ message: string }> {
    await this.adminService.muteAll(+roomId, user.id);
    return { message: 'All participants muted' };
  }

  @Post('unmute-all')
  @RequirePermissions('participants', 'unmute')
  @ApiOperation({ summary: 'Unmute all participants' })
  @ApiResponse({ status: 200, description: 'All participants unmuted' })
  async unmuteAllParticipants(
    @Param('roomId') roomId: string,
  ): Promise<{ message: string }> {
    await this.adminService.unmuteAll(+roomId);
    return { message: 'All participants unmuted' };
  }
}
