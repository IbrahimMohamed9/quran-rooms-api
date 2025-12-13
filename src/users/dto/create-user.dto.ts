import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
import Gender from '../types/gender';

export class CreateUserDto {
  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The email of the user',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The country of the user',
    example: 'United States',
  })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ description: 'The role ID of the user', example: 1 })
  @IsOptional()
  @IsNumber()
  roleId?: number;

  @ApiProperty({
    description: 'The password of the user',
    example: 'Password123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'The phone number of the user',
    example: '+1234567890',
  })
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    description: 'The gender of the user',
    example: 'Male',
  })
  @IsNotEmpty()
  @IsEnum(Gender)
  gender: Gender;
}
