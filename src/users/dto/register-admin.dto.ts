import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterAdminDto {
  @ApiProperty({
    description: 'The email of the admin user',
    example: 'admin@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password of the admin user',
    example: 'StrongPassword123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
