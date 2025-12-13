import {
  Injectable,
  NotFoundException,
  ConflictException,
  Scope,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { CustomLoggerService } from '../logger/logger.service';
import { handleError } from '../utils/error-handler.util';
import { Users } from '../users/entities/users.entity';
import { PermissionsService } from './permissions.service';

/**
 * Roles Service
 *
 * Handles role-related operations
 */
@Injectable({
  scope: Scope.REQUEST,
})
export class RolesService {
  /**
   * Constructor
   *
   * Initializes the roles repository and custom logger
   */
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly logger: CustomLoggerService,
    private readonly permissionsService: PermissionsService,
  ) {
    this.logger.setContext('RolesService');
  }

  /**
   * Create a new role
   *
   * @param createRoleDto Role creation data
   * @returns Created role
   */
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      // Check if role with the same name already exists
      const existingRole = await this.roleRepository.findOne({
        where: { name: createRoleDto.name },
      });

      if (existingRole) {
        throw new ConflictException(
          `Role with name ${createRoleDto.name} already exists`,
        );
      }

      // Validate permissions if provided
      if (
        createRoleDto.permissions &&
        Object.keys(createRoleDto.permissions).length > 0
      ) {
        const validPermissions = this.validatePermissions(
          createRoleDto.permissions,
        );
        if (!validPermissions) {
          throw new ConflictException('Invalid permissions provided');
        }
      }

      // Create new role with permissions
      const role = this.roleRepository.create({
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: createRoleDto.permissions || {},
      });

      return await this.roleRepository.save(role);
    } catch (err) {
      return handleError(
        err,
        [ConflictException],
        'Failed to create role',
        () => {
          this.logger.logError(err, 'RolesService.create', {
            dto: createRoleDto,
          });
        },
      );
    }
  }

  /**
   * Find all roles
   *
   * @returns List of all roles
   */
  async findAll(): Promise<Role[]> {
    try {
      return await this.roleRepository.find({
        order: {
          name: 'ASC',
        },
      });
    } catch (err) {
      return handleError(err, [], 'Failed to retrieve roles', () => {
        this.logger.logError(err, 'RolesService.findAll');
      });
    }
  }

  /**
   * Find a role by ID
   *
   * @param id Role ID
   * @returns Role
   */
  async findOne(id: number): Promise<Role> {
    try {
      if (isNaN(id) || id <= 0) {
        throw new NotFoundException(`Invalid role ID: ${id}`);
      }

      const role = await this.roleRepository.findOne({
        where: { id },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      return role;
    } catch (err) {
      return handleError(
        err,
        [NotFoundException],
        `Failed to retrieve role with ID ${id}`,
        () => {
          this.logger.logError(err, 'RolesService.findOne', { roleId: id });
        },
      );
    }
  }

  /**
   * Find a role by name
   *
   * @param name Role name
   * @returns Role
   */
  async findByName(name: string): Promise<Role> {
    try {
      const role = await this.roleRepository.findOne({
        where: { name },
      });

      if (!role) {
        throw new NotFoundException(`Role with name ${name} not found`);
      }

      return role;
    } catch (err) {
      return handleError(
        err,
        [NotFoundException],
        `Failed to retrieve role with name ${name}`,
        () => {
          this.logger.logError(err, 'RolesService.findByName', { name });
        },
      );
    }
  }

  /**
   * Update a role
   *
   * @param id Role ID
   * @param updateRoleDto Role update data
   * @returns Updated role
   */
  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    try {
      // Validate that id is a valid number
      if (isNaN(id) || id <= 0) {
        throw new NotFoundException(`Invalid role ID: ${id}`);
      }

      const role = await this.roleRepository.findOne({
        where: { id },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // Check if this is a system role that shouldn't be modified
      if (
        (role.name === 'Admin' || role.name === 'SuperAdmin') &&
        updateRoleDto.name &&
        updateRoleDto.name !== role.name
      ) {
        throw new ConflictException(
          `Cannot change name of system role: ${role.name}`,
        );
      }

      // If name is being updated, check for conflicts
      if (updateRoleDto.name && updateRoleDto.name !== role.name) {
        const existingRole = await this.roleRepository.findOne({
          where: { name: updateRoleDto.name },
        });

        if (existingRole) {
          throw new ConflictException(
            `Role with name ${updateRoleDto.name} already exists`,
          );
        }
      }

      // Validate permissions if provided
      if (
        updateRoleDto.permissions &&
        Object.keys(updateRoleDto.permissions).length > 0
      ) {
        const validPermissions = this.validatePermissions(
          updateRoleDto.permissions,
        );
        if (!validPermissions) {
          throw new ConflictException('Invalid permissions provided');
        }
      }

      // Update role properties
      if (updateRoleDto.name) role.name = updateRoleDto.name;
      if (updateRoleDto.description !== undefined) {
        role.description = updateRoleDto.description;
      }
      if (updateRoleDto.permissions)
        role.permissions = updateRoleDto.permissions;

      return await this.roleRepository.save(role);
    } catch (err) {
      return handleError(
        err,
        [ConflictException, NotFoundException],
        `Failed to update role with ID ${id}`,
        () => {
          this.logger.logError(err, 'RolesService.update', {
            roleId: id,
            dto: updateRoleDto,
          });
        },
      );
    }
  }

  /**
   * Remove a role
   *
   * @param id Role ID
   */
  async remove(id: number): Promise<void> {
    try {
      // Validate that id is a valid number
      if (isNaN(id) || id <= 0) {
        throw new NotFoundException(`Invalid role ID: ${id}`);
      }

      const role = await this.roleRepository.findOne({
        where: { id },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // Check if this is a system role that shouldn't be deleted
      if (role.name === 'Admin' || role.name === 'SuperAdmin') {
        throw new ConflictException(`Cannot delete system role: ${role.name}`);
      }

      await this.roleRepository.remove(role);
    } catch (err) {
      return handleError(
        err,
        [NotFoundException, ConflictException],
        `Failed to delete role with ID ${id}`,
        () => {
          this.logger.logError(err, 'RolesService.remove', { roleId: id });
        },
      );
    }
  }

  /**
   * Get available permissions
   *
   * @returns Object with available permissions
   */
  getAvailablePermissions(): Record<string, string[]> {
    return this.permissionsService.getAvailablePermissions();
  }

  /**
   * Validate permissions
   *
   * @param permissions Permissions to validate as a Record<string, string[]>
   * @returns Boolean indicating if permissions are valid
   */
  validatePermissions(permissions: Record<string, string[]>): boolean {
    return this.permissionsService.validatePermissions(permissions);
  }

  /**
   * Assign a role to a user
   *
   * @param userId User ID
   * @param roleId Role ID
   */
  async assignRoleToUser(userId: number, roleId: number): Promise<void> {
    try {
      const role = await this.findOne(roleId);
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      user.roleId = role.id;
      await this.userRepository.save(user);
      this.logger.log(
        `Assigned role ${role.name} (ID: ${roleId}) to user ID ${userId}`,
      );
    } catch (err) {
      return handleError(
        err,
        [NotFoundException],
        `Failed to assign role ID ${roleId} to user ID ${userId}`,
        () => {
          this.logger.logError(err, 'RolesService.assignRoleToUser', {
            userId,
            roleId,
          });
        },
      );
    }
  }
}
