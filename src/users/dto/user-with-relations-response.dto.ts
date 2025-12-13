import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from './user-response.dto';

@Exclude()
export class UserWithRelationsResponseDto extends UserResponseDto {}
