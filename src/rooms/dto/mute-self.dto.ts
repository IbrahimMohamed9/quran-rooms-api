import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class MuteSelfDto {
  @ApiProperty({ description: 'Whether to mute or unmute', example: true })
  @IsBoolean()
  muted: boolean;
}
