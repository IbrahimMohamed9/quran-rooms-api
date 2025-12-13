import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
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
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CustomLoggerService } from '../logger/logger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminOnly,
  RequirePermissions,
} from '../auth/decorators/roles.decorator';
import { Role } from './entities/role.entity';

/**
 * Roles Controller
 *
 * Handles role-related operations
 */
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  /**
   * Constructor
   *
   * Initializes the roles service and custom logger
   */
  constructor(
    private readonly rolesService: RolesService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('RolesController');
  }

  /**
   * Create a new role
   *
   * @param createRoleDto Role creation data
   * @returns Created role
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('roles.create')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role has been successfully created.',
    type: Role,
  })
  @ApiConflictResponse({
    description: 'Role with the same name already exists.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to create role.',
  })
  async create(@Body() createRoleDto: CreateRoleDto) {
    this.logger.log(`Creating new role with name: ${createRoleDto.name}`);
    return await this.rolesService.create(createRoleDto);
  }

  /**
   * Get all roles
   *
   * @returns List of all roles
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('roles.read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all roles (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all roles.',
    type: [Role],
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Admin role required.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve roles.',
  })
  async findAll() {
    this.logger.log('Retrieving all roles');
    return await this.rolesService.findAll();
  }

  /**
   * Get available permissions
   *
   * @returns Object with available permissions
   */
  @Get('permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('roles.read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get available permissions (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available permissions object.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Admin role required.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve permissions.',
  })
  getAvailablePermissions() {
    this.logger.log('Retrieving available permissions');
    return this.rolesService.getAvailablePermissions();
  }

  /**
   * Get a role by ID
   *
   * @param id Role ID
   * @returns Role
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('roles.read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role found.',
    type: Role,
  })
  @ApiNotFoundResponse({
    description: 'Role not found.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve role.',
  })
  async findOne(@Param('id') id: string) {
    const roleId = parseInt(id, 10);
    this.logger.log(`Retrieving role with ID: ${roleId}`);
    return await this.rolesService.findOne(roleId);
  }

  /**
   * Update a role
   *
   * @param id Role ID
   * @param updateRoleDto Role update data
   * @returns Updated role
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('roles.update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role has been successfully updated.',
    type: Role,
  })
  @ApiNotFoundResponse({
    description: 'Role not found.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data.',
  })
  @ApiConflictResponse({
    description:
      'Role with the same name already exists or system role modification attempted.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to update role.',
  })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const roleId = parseInt(id, 10);
    this.logger.log(`Updating role with ID: ${roleId}`);
    return await this.rolesService.update(roleId, updateRoleDto);
  }

  /**
   * Delete a role
   *
   * @param id Role ID
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @RequirePermissions('roles.delete')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Role has been successfully deleted.',
  })
  @ApiNotFoundResponse({
    description: 'Role not found.',
  })
  @ApiConflictResponse({
    description: 'Cannot delete system role.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Admin role required.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to delete role.',
  })
  async remove(@Param('id') id: string): Promise<void> {
    const roleId = parseInt(id, 10);
    this.logger.log(`Deleting role with ID: ${roleId}`);
    await this.rolesService.remove(roleId);
  }
}
