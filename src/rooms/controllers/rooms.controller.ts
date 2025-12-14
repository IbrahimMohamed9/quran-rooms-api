import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoomsService } from '../services/rooms.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Users } from '../../users/entities/users.entity';
import { Room } from '../entities/room.entity';
import { RequirePermissions } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @RequirePermissions('rooms', 'create')
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    type: Room,
  })
  async createRoom(
    @Body() createRoomDto: CreateRoomDto,
    @CurrentUser() user: Users,
  ): Promise<Room> {
    return this.roomsService.createRoom(createRoomDto, user.id);
  }
}
