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
import { CurrentUser } from '../decorators/current-user.decorator';
import { Users } from '../../users/entities/users.entity';
import { RequirePermissions } from 'src/auth/decorators/roles.decorator';

@ApiTags('room-admin')
@Controller('rooms/:roomId/admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
