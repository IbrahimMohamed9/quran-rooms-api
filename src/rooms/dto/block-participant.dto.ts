import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class BlockParticipantDto {
  @ApiProperty({
    required: false,
    description: 'Reason for blocking',
    example: 'Disruptive behavior',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
