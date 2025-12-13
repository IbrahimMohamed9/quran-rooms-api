/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  HttpStatus,
  HttpCode,
  UseGuards,
  UploadedFile,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiConsumes,
  ApiBody,
  ApiSecurity,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CustomLoggerService } from '../logger/logger.service';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminOnly,
  RequirePermissions,
} from '../auth/decorators/roles.decorator';
import { MeOrAdminOrAuthorized } from '../auth/decorators/me-or-admin.decorator';
import { ImageUpload } from '../file-upload/decorators/image-upload.decorator';
import { ImageUploadHelper } from '../file-upload/helpers/image-upload.helper';
import { RolesService } from '../roles/roles.service';
import { Param } from '@nestjs/common';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import Gender from './types/gender';

/**
 * Users Controller
 *
 * Handles user-related operations
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  /**
   * Constructor
   *
   * Initializes the users service and custom logger
   */
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: CustomLoggerService,
    private readonly imageUploadHelper: ImageUploadHelper,
    private readonly rolesService: RolesService,
  ) {
    this.logger.setContext('UsersController');
  }

  /**
   * Create a new user
   *
   * @param createUserDto User creation data
   * @returns Created user
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('users.create')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
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
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Creating new user with email: ${createUserDto.email}`);
    return await this.usersService.create(createUserDto);
  }

  /**
   * Get all users
   *
   * @returns List of all users
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('users.read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all users.',
    type: [UserResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Admin role required.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve users.',
  })
  async findAll(): Promise<UserResponseDto[]> {
    this.logger.log('Retrieving all users');
    return await this.usersService.findAll();
  }

  /**
   * Get a user with permissions by ID
   *
   * @param id User ID
   * @returns User with permissions
   */
  @Get(':userId/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a user with permissions by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User found.',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve user.',
  })
  async findOneWithPermissions(
    @Param('userId') userId: number,
  ): Promise<UserResponseDto> {
    this.logger.log(`Retrieving user with ID: ${userId}`);
    return await this.usersService.findOneWithPermissions(userId);
  }

  /**
   * Get a user by ID
   *
   * @param id User ID
   * @returns User
   */
  @Get(':userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User found.',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve user.',
  })
  async findOne(
    @MeOrAdminOrAuthorized('users.read') userId: number,
  ): Promise<UserResponseDto> {
    this.logger.log(`Retrieving user with ID: ${userId}`);
    return await this.usersService.findOne(userId);
  }

  /**
   * Update a user
   *
   * @param userId User ID
   * @param updateUserDto User update data
   * @returns Updated user
   */
  @Patch(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User has been successfully updated.',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data.',
  })
  @ApiConflictResponse({
    description: 'Phone number already exists.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to update user.',
  })
  async update(
    @MeOrAdminOrAuthorized('users.update') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`Updating user with ID: ${userId}`);
    return await this.usersService.update(userId, updateUserDto);
  }

  /**
   * Delete a user
   *
   * @param userId User ID
   */
  @Delete(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User has been successfully deleted.',
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Admin role required.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to delete user.',
  })
  async remove(
    @MeOrAdminOrAuthorized('users.delete') userId: number,
  ): Promise<void> {
    this.logger.log(`Deleting user with ID: ${userId}`);
    await this.usersService.remove(userId);
  }

  /**
   * Upload a profile image for a user
   *
   * @param userId User ID
   * @param file Image file
   * @returns Object with image URL
   */
  @Post(':userId/image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload a profile image' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile image uploaded successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to upload profile image.',
  })
  @ImageUpload()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload profile image',
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadProfileImage(
    @MeOrAdminOrAuthorized('users.update') userId: number,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    this.logger.log(`Uploading profile image for user with ID: ${userId}`);
    const imageUrl = await this.imageUploadHelper.uploadImageAndGetUrl(
      photo,
      'users',
    );
    return await this.usersService.updateProfileImage(userId, imageUrl);
  }

  /**
   * Change a user's password
   *
   * @param userId User ID
   * @param changePasswordDto Change password data
   * @returns Success message
   */
  @Patch(':userId/change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('users.update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Change a user's password (Admin only)" })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password has been successfully changed.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password changed successfully',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Admin role required.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid password format.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to change password.',
  })
  async changePassword(
    @Param('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Changing password for user ID ${userId}`);
    return await this.usersService.changePassword(
      parseInt(userId, 10),
      changePasswordDto.newPassword,
    );
  }

  /**
   * Assign a role to a user
   *
   * @param userId User ID
   * @param roleId Role ID
   */
  @Post(':userId/roles/:roleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('users.update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role has been successfully assigned to the user.',
  })
  @ApiNotFoundResponse({
    description: 'User or role not found.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Admin role required.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to assign role to user.',
  })
  async assignRoleToUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ): Promise<void> {
    this.logger.log(`Assigning role ID ${roleId} to user ID ${userId}`);
    await this.rolesService.assignRoleToUser(
      parseInt(userId, 10),
      parseInt(roleId, 10),
    );
  }
}
