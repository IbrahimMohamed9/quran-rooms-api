import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ParticipantsService } from '../services/participants.service';
import { MuteSelfDto } from '../dto/mute-self.dto';
import { UserTokenDto } from '../dto/user-token.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('participants')
@Controller('rooms/:roomId/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post('join')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'roomId',
    type: 'number',
    description: 'The ID of the room to join',
    example: 1,
  })
  @ApiBody({
    type: UserTokenDto,
    description: 'User token and name for joining the room',
    examples: {
      example1: {
        value: {
          token: 'user_123',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Join a room as authenticated user and get LiveKit token',
    description:
      'Allows an authenticated user to join a room. Requires JWT authentication. The user ID is extracted from the JWT token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined room as authenticated user',
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        participant: {
          id: 1,
          roomId: 1,
          userId: 123,
          participantRole: 'admin',
          isMuted: false,
          joinedAt: '2025-12-14T00:55:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Room is full or invalid parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found or inactive',
  })
  async joinRoom(
    @Param('roomId') roomId: string,
    @Body() userToken: UserTokenDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.participantsService.joinRoom(
      +roomId,
      userToken.token,
      userToken.name,
      userId,
    );
  }

  @Post('join-guest')
  @ApiParam({
    name: 'roomId',
    type: 'number',
    description: 'The ID of the room to join',
    example: 1,
  })
  @ApiBody({
    type: UserTokenDto,
    description: 'Guest token and name for joining the room',
    examples: {
      example1: {
        value: {
          token: 'guest_abc123xyz',
          name: 'Guest User',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Join a room as guest and get LiveKit token',
    description:
      'Allows a guest (non-authenticated) user to join a room. No authentication required. Guest provides a unique token and display name.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined room as guest',
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        participant: {
          id: 2,
          roomId: 1,
          userId: null,
          participantToken: 'guest_abc123xyz',
          participantName: 'Guest User',
          participantRole: 'participant',
          isMuted: false,
          joinedAt: '2025-12-14T00:55:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Room is full or invalid parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found or inactive',
  })
  async joinRoomAsGuest(
    @Param('roomId') roomId: string,
    @Body() userToken: UserTokenDto,
  ) {
    return this.participantsService.joinRoom(
      +roomId,
      userToken.token,
      userToken.name,
    );
  }

  @Post('leave')
  @ApiParam({
    name: 'roomId',
    type: 'number',
    description: 'The ID of the room to leave',
    example: 1,
  })
  @ApiBody({
    type: UserTokenDto,
    description: 'User token and name for identifying the participant leaving',
    examples: {
      example1: {
        value: {
          token: 'user_123',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Leave a room',
    description:
      'Allows a participant to leave a room. Removes the participant from the room and disconnects from LiveKit.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully left room',
    schema: {
      example: {
        message: 'Successfully left room',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Participant not found in room',
  })
  async leaveRoom(
    @Param('roomId') roomId: string,
    @Body() userToken: UserTokenDto,
  ): Promise<{ message: string }> {
    await this.participantsService.leaveRoom(+roomId, userToken.token);
    return { message: 'Successfully left room' };
  }

  @Post('mute-self')
  @ApiParam({
    name: 'roomId',
    type: 'number',
    description: 'The ID of the room',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'User token for identifying the participant',
          example: 'user_123',
        },
        muted: {
          type: 'boolean',
          description:
            'Whether to mute (true) or unmute (false) the participant',
          example: true,
        },
      },
      required: ['token', 'muted'],
    },
    examples: {
      mute: {
        value: {
          token: 'user_123',
          muted: true,
        },
      },
      unmute: {
        value: {
          token: 'user_123',
          muted: false,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Mute or unmute yourself in a room',
    description:
      'Allows a participant to mute or unmute their microphone in a room. Respects room mute settings and permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Mute status updated successfully',
    schema: {
      example: {
        message: 'Successfully muted',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (e.g., only admin can unmute)',
  })
  @ApiResponse({
    status: 404,
    description: 'Participant not found in room or room settings not found',
  })
  async muteSelf(
    @Param('roomId') roomId: string,
    @Body() dto: MuteSelfDto & UserTokenDto,
  ): Promise<{ message: string }> {
    await this.participantsService.muteSelf(+roomId, dto.token, dto.muted);
    return { message: `Successfully ${dto.muted ? 'muted' : 'unmuted'}` };
  }
}
