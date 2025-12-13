import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import Gender from '../types/gender';
import { RoleResponseDto } from '../../roles/dto/role-response.dto';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ description: 'The unique identifier of the user' })
  id: number;

  @Expose()
  @ApiProperty({ description: 'The name of the user' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'The email of the user' })
  email: string;

  @Expose()
  @ApiProperty({ description: 'The country of the user' })
  country: string;

  @Expose()
  @Type(() => RoleResponseDto)
  @ApiProperty({
    description: 'The role of the user',
    type: () => RoleResponseDto,
  })
  role: RoleResponseDto;

  @Expose()
  @ApiProperty({ description: 'The role ID of the user' })
  roleId: number;

  @Expose()
  @ApiProperty({ description: 'The phone number of the user' })
  phone: string;

  @Expose()
  @ApiProperty({
    description: 'The gender of the user',
    enum: Gender,
  })
  gender: string;

  @Expose()
  @ApiProperty({
    description: 'The profile image URL of the user',
    required: false,
  })
  imageUrl?: string;

  @Expose()
  @ApiProperty({ description: 'The creation date of the user record' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'The last update date of the user record' })
  updatedAt: Date;
}
