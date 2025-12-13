import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AudioQuality } from '../entities/room-settings.entity';

export class CreateRoomSettingsDto {
  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  allowMicControl?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  defaultMutedOnJoin?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  onlyAdminCanUnmute?: boolean;

  @ApiProperty({
    enum: AudioQuality,
    default: AudioQuality.MEDIUM,
    required: false,
  })
  @IsEnum(AudioQuality)
  @IsOptional()
  audioQuality?: AudioQuality;
}

export class CreateRoomDto {
  @ApiProperty({ description: 'Name of the room', example: 'Team Meeting' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Room description',
    required: false,
    example: 'Weekly team sync',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Maximum number of participants',
    default: 50,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxParticipants?: number;

  @ApiProperty({
    description: 'Whether participants need approval to join',
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @ApiProperty({ type: () => CreateRoomSettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateRoomSettingsDto)
  settings?: CreateRoomSettingsDto;
}
