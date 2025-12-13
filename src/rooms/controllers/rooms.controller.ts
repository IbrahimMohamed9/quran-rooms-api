import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoomsService } from '../services/rooms.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { ListRoomsDto } from '../dto/list-rooms.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RoomAdminGuard } from '../guards/room-admin.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Users } from '../../users/entities/users.entity';
import { Room } from '../entities/room.entity';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @RequirePermission('rooms', 'create')
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

  @Get()
  @ApiOperation({ summary: 'List all rooms' })
  @ApiResponse({ status: 200, description: 'Rooms retrieved successfully' })
  async listRooms(@Query() query: ListRoomsDto) {
    return this.roomsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details' })
  @ApiResponse({
    status: 200,
    description: 'Room details retrieved',
    type: Room,
  })
  async getRoomDetails(@Param('id') id: string): Promise<Room> {
    return this.roomsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RoomAdminGuard)
  @RequirePermission('rooms', 'update')
  @ApiOperation({ summary: 'Update room details' })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
    type: Room,
  })
  async updateRoom(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ): Promise<Room> {
    return this.roomsService.update(+id, updateRoomDto);
  }

  @Delete(':id')
  @UseGuards(RoomAdminGuard)
  @RequirePermission('rooms', 'delete')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  async deleteRoom(@Param('id') id: string): Promise<{ message: string }> {
    await this.roomsService.remove(+id);
    return { message: 'Room deleted successfully' };
  }

  @Post(':id/close')
  @UseGuards(RoomAdminGuard)
  @RequirePermission('rooms', 'close')
  @ApiOperation({ summary: 'Close a room' })
  @ApiResponse({ status: 200, description: 'Room closed successfully' })
  async closeRoom(@Param('id') id: string): Promise<{ message: string }> {
    await this.roomsService.closeRoom(+id);
    return { message: 'Room closed successfully' };
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get room participants' })
  @ApiResponse({
    status: 200,
    description: 'Participants retrieved successfully',
  })
  async getParticipants(@Param('id') id: string) {
    return this.roomsService.getParticipants(+id);
  }
}
