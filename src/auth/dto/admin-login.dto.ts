import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    description: 'The email of the admin',
    example: 'admin@restaurant.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password of the admin',
    example: 'Password123',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
