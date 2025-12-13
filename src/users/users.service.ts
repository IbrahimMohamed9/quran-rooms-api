import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Users } from './entities/users.entity';
import { CustomLoggerService } from '../logger/logger.service';
import { handleError } from '../utils/error-handler.util';
import { UserResponseDto } from './dto/user-response.dto';
import { hashPassword } from '../utils/password.util';
import { plainToInstance } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';

/**
 * Users Service
 *
 * Handles user-related operations
 */
@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  /**
   * Constructor
   *
   * Initializes the users repository and custom logger
   */
  constructor(
    private readonly logger: CustomLoggerService,
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
  ) {
    this.logger.setContext('UsersService');
  }

  /**
   * Check if an email already exists in the database
   *
   * @param email Email to check
   * @param excludeUserId Optional user ID to exclude from the check
   * @throws ConflictException if email already exists
   */
  private async checkIfEmailExists(
    email?: string,
    excludeUserId?: number,
  ): Promise<void> {
    if (!email) return;

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser && (!excludeUserId || existingUser.id !== excludeUserId)) {
      throw new ConflictException('Email already exists');
    }
  }

  /**
   * Check if a phone number already exists in the database
   *
   * @param phone Phone number to check
   * @param excludeUserId Optional user ID to exclude from the check
   * @throws ConflictException if phone already exists
   */
  private async checkIfPhoneExists(
    phone?: string,
    excludeUserId?: number,
  ): Promise<void> {
    if (!phone) return;

    const existingUser = await this.usersRepository.findOne({
      where: { phone },
    });

    if (existingUser && (!excludeUserId || existingUser.id !== excludeUserId)) {
      throw new ConflictException('Phone already exists');
    }
  }

  /**
   * Create a new user
   *
   * @param createUserDto User creation data
   * @returns Created user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Check if email or phone already exists
      await this.checkIfEmailExists(createUserDto.email);
      await this.checkIfPhoneExists(createUserDto.phone);

      const hashedPassword = await hashPassword(createUserDto.password);

      const user = this.usersRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });
      const savedUser = await this.usersRepository.save(user);
      return plainToInstance(UserResponseDto, savedUser);
    } catch (err) {
      return handleError(
        err,
        [ConflictException, BadRequestException],
        'Failed to create user',
        () => {
          this.logger.logError(err, 'UsersService.create', {
            dto: createUserDto,
          });
        },
      );
    }
  }

  /**
   * Find all users
   *
   * @returns List of all users
   */
  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.usersRepository.find({
        relations: ['role'],
      });
      return plainToInstance(UserResponseDto, users);
    } catch (err) {
      return handleError(err, [], 'Failed to retrieve users', () => {
        this.logger.logError(err, 'UsersService.findAll');
      });
    }
  }

  /**
   * Find a user by ID
   *
   * @param id User ID
   * @returns User
   */
  async findOne(id: number) {
    try {
      const user = await this.usersRepository.findOne({
        where: { id },
        relations: ['role'],
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return plainToInstance(UserResponseDto, user);
    } catch (err) {
      return handleError(
        err,
        [NotFoundException],
        `Failed to retrieve user with ID ${id}`,
        () => {
          this.logger.logError(err, 'UsersService.findOne', { userId: id });
        },
      );
    }
  }

  /**
   * Find a user with permissions
   *
   * @param id User ID
   * @returns User
   */
  async findOneWithPermissions(id: number) {
    try {
      const user = await this.usersRepository.findOne({
        where: { id },
        relations: ['role'],
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (err) {
      return handleError(
        err,
        [NotFoundException],
        `Failed to retrieve user with ID ${id}`,
        () => {
          this.logger.logError(err, 'UsersService.findOneWithPermissions', {
            userId: id,
          });
        },
      );
    }
  }

  /**
   * Find a user by email with password
   *
   * @param email User email
   * @returns User with password
   */
  async findByEmail(email: string) {
    try {
      const user = await this.usersRepository.findOne({
        where: { email: email.toLowerCase() },
        select: [
          'id',
          'email',
          'name',
          'roleId',
          'password',
          'phone',
          'gender',
          'imageUrl',
          'country',
        ],
        relations: ['role'],
      });
      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      return user;
    } catch (err) {
      return handleError(
        err,
        [NotFoundException],
        `Failed to retrieve user with email ${email}`,
        () => {
          this.logger.logError(err, 'UsersService.findByEmail', { email });
        },
      );
    }
  }

  /**
   * Update a user
   *
   * @param id User ID
   * @param updateUserDto User update data
   * @returns Updated user
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      // Check if phone exists (if provided)
      if (updateUserDto.phone) {
        await this.checkIfPhoneExists(updateUserDto.phone, id);
      }

      // Get the actual entity instead of the DTO

      const userEntity = await this.usersRepository.findOne({ where: { id } });
      if (!userEntity) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      Object.assign(userEntity, updateUserDto);
      const savedUser = await this.usersRepository.save(userEntity);
      return plainToInstance(UserResponseDto, savedUser);
    } catch (err) {
      return handleError(
        err,
        [BadRequestException, ConflictException, NotFoundException],
        `Failed to update user with ID ${id}`,
        () => {
          this.logger.logError(err, 'UsersService.update', {
            userId: id,
            dto: updateUserDto,
          });
        },
      );
    }
  }

  /**
   * Remove a user
   *
   * @param id User ID
   */
  async remove(id: number): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      await this.usersRepository.remove(user);
    } catch (err) {
      return handleError(
        err,
        [NotFoundException],
        `Failed to delete user with ID ${id}`,
        () => {
          this.logger.logError(err, 'UsersService.remove', { userId: id });
        },
      );
    }
  }

  /**
   * Change a user's password
   *
   * @param id User ID
   * @param newPassword New password
   * @returns Success message
   */
  async changePassword(
    id: number,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const userEntity = await this.usersRepository.findOne({ where: { id } });
      if (!userEntity) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      const hashedPassword = await hashPassword(newPassword);
      userEntity.password = hashedPassword;
      await this.usersRepository.save(userEntity);

      this.logger.log(`Password changed successfully for user with ID: ${id}`);
      return { message: 'Password changed successfully' };
    } catch (err) {
      return handleError(
        err,
        [NotFoundException, BadRequestException],
        `Failed to change password for user with ID ${id}`,
        () => {
          this.logger.logError(err, 'UsersService.changePassword', {
            userId: id,
          });
        },
      );
    }
  }

  /**
   * Update a user's profile image
   *
   * @param id User ID
   * @param imageUrl URL of the uploaded image
   * @returns Object with image URL
   */
  async updateProfileImage(
    id: number,
    imageUrl: string,
  ): Promise<{ imageUrl: string }> {
    try {
      // Get the actual entity instead of the DTO

      const userEntity = await this.usersRepository.findOne({ where: { id } });
      if (!userEntity) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      userEntity.imageUrl = imageUrl;
      await this.usersRepository.save(userEntity);

      return { imageUrl };
    } catch (err) {
      return handleError(
        err,
        [NotFoundException, BadRequestException],
        `Failed to update profile image for user with ID ${id}`,
        () => {
          this.logger.logError(err, 'UsersService.updateProfileImage', {
            userId: id,
          });
        },
      );
    }
  }
}
