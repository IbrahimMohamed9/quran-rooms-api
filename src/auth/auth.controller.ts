import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CustomLoggerService } from '../logger/logger.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserRegistrationDto } from './dto/user-registration';
import { CreateUserDto } from '../users/dto/create-user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('AuthController');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User has been successfully logged in.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to login.',
  })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for user with email: ${loginDto.email}`);

    const user = await this.authService.login(loginDto);

    return user;
  }

  /**
   * Create a new user
   *
   * @param createUserDto User creation data
   * @returns Created user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Handles the registration of a new user with the provided information.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User has been successfully created.',
    type: UserResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email or phone number already exists.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to create user.',
  })
  async register(@Body() createUserDto: UserRegistrationDto) {
    this.logger.log(`Creating new user with email: ${createUserDto.email}`);

    const user = new CreateUserDto();
    user.roleId = 1;
    user.name = createUserDto.name;
    user.email = createUserDto.email;
    user.country = createUserDto.country;
    user.phone = createUserDto.phone;
    user.gender = createUserDto.gender;
    user.password = createUserDto.password;

    return await this.authService.register(user);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as admin' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin has been successfully logged in.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Admin privileges required.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to login as admin.',
  })
  async adminLogin(@Body() adminLoginDto: AdminLoginDto) {
    this.logger.log(
      `Admin login attempt for user with email: ${adminLoginDto.email}`,
    );
    return await this.authService.adminLogin(adminLoginDto);
  }
}
