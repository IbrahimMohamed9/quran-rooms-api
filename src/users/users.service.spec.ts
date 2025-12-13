/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// Mock the entity imports to avoid module resolution errors
jest.mock('./entities/users.entity', () => {
  class MockUsers {}
  return { Users: MockUsers };
});

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Users } from './entities/users.entity';
import { CustomLoggerService } from '../logger/logger.service';
import { TenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { NotFoundException } from '@nestjs/common';
import * as passwordUtil from '../utils/password.util';
import Gender from './types/gender';
import { Role } from '../roles/entities/role.entity';

describe('UsersService', () => {
  let service: UsersService;
  let mockTenantRepositoryProvider: {
    getRepository: jest.Mock;
  };
  let mockRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let mockLogger: {
    setContext: jest.Mock;
    logError: jest.Mock;
    log: jest.Mock;
    warn: jest.Mock;
  };

  const mockUser: Partial<Users> = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: {
      id: 1,
      name: 'user',
      permissions: {},
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Role,
    roleId: 1,
    password: 'hashedpassword',
    phone: '1234567890',
    gender: Gender.MALE,
    imageUrl: 'http://example.com/image.jpg',
    country: 'US',
  };

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockLogger = {
      setContext: jest.fn(),
      logError: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };

    mockTenantRepositoryProvider = {
      getRepository: jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockRepository)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
        {
          provide: TenantRepositoryProvider,
          useValue: mockTenantRepositoryProvider,
        },
      ],
    }).compile();

    service = await module.resolve<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      roleId: 1,
      phone: '9876543210',
      gender: Gender.FEMALE,
      country: 'CA',
    };

    const hashedPassword = 'hashed_password_123';

    beforeEach(() => {
      jest
        .spyOn(passwordUtil, 'hashPassword')
        .mockResolvedValue(hashedPassword);
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should create a new user successfully', async () => {
      // Mock checkIfEmailExists and checkIfPhoneExists behavior
      mockRepository.findOne.mockImplementation(() => {
        return Promise.resolve(null);
      });

      mockRepository.create.mockReturnValue({
        ...createUserDto,
        password: hashedPassword,
      });
      mockRepository.save.mockResolvedValue({
        id: 1,
        ...createUserDto,
        password: hashedPassword,
        imageUrl: null,
      });

      const result = await service.create(createUserDto);

      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: hashedPassword,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          email: createUserDto.email,
          name: createUserDto.name,
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      // Mock email check to return existing user
      mockRepository.findOne.mockImplementation((options: any) => {
        if (options?.where?.email === createUserDto.email) {
          return Promise.resolve({
            id: 2,
            email: createUserDto.email,
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Email already exists',
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if phone already exists', async () => {
      // First call for email check returns null (email doesn't exist)
      // Second call for phone check returns existing user with same phone
      let callCount = 0;
      mockRepository.findOne.mockImplementation((options: any) => {
        callCount++;
        if (callCount === 1) {
          // First call for email check
          return Promise.resolve(null);
        }
        if (callCount === 2 && options?.where?.phone === createUserDto.phone) {
          // Second call for phone check
          return Promise.resolve({
            id: 2,
            phone: createUserDto.phone,
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Phone already exists',
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const userId = 1;
    const existingUser = {
      id: userId,
      email: 'existing@example.com',
      name: 'Existing User',
      password: 'hashed_password',
      roleId: 1,
      role: {
        id: 1,
        name: 'user',
        permissions: {},
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Role,
      phone: '1234567890',
      gender: Gender.MALE,
      country: 'US',
      imageUrl: null,
    };

    const updateUserDto = {
      name: 'Updated Name',
      phone: '0987654321',
      country: 'UK',
    };

    it('should update a user successfully', async () => {
      // Mock phone check to return null (phone doesn't exist)
      // Mock user lookup to return existing user
      mockRepository.findOne.mockImplementation((options: any) => {
        if (options?.where?.id === userId) {
          return Promise.resolve(existingUser);
        }
        if (
          options?.where?.phone === updateUserDto.phone &&
          !options?.where?.id
        ) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      mockRepository.save.mockResolvedValue({
        ...existingUser,
        ...updateUserDto,
      });

      const result = await service.update(userId, updateUserDto);

      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingUser,
        ...updateUserDto,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: userId,
          name: updateUserDto.name,
          phone: updateUserDto.phone,
          country: updateUserDto.country,
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if phone already exists for another user', async () => {
      // First call returns the user being updated
      // Second call for phone check returns a different user with same phone
      mockRepository.findOne.mockImplementation((options: any) => {
        if (options?.where?.id === userId) {
          return Promise.resolve(existingUser);
        }
        if (
          options?.where?.phone === updateUserDto.phone &&
          !options?.where?.id
        ) {
          return Promise.resolve({
            id: 2,
            phone: updateUserDto.phone,
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        'Phone already exists',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return a user when a valid email is provided', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
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
    });

    it('should convert email to lowercase before searching', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await service.findByEmail('TEST@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.arrayContaining(['id', 'email', 'roleId', 'password']),
        relations: ['role'],
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByEmail('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOne).toHaveBeenCalled();
    });
  });
  describe('findOne', () => {
    it('should return a user when a valid id is provided', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Mock the plainToInstance transformation that happens in the service
      const expectedResponse = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        roleId: mockUser.roleId,
        phone: mockUser.phone,
        gender: mockUser.gender,
        imageUrl: mockUser.imageUrl,
        country: mockUser.country,
        role: {
          id: mockUser.role?.id,
          name: mockUser.role?.name,
          permissions: mockUser.role?.permissions || {},
          description: mockUser.role?.description || '',
          createdAt: mockUser.role?.createdAt,
          updatedAt: mockUser.role?.updatedAt,
        },
        createdAt: undefined,
        updatedAt: undefined,
      };

      const result = await service.findOne(1);
      expect(result).toMatchObject(
        expect.objectContaining({
          id: expectedResponse.id,
          email: expectedResponse.email,
          name: expectedResponse.name,
          roleId: expectedResponse.roleId,
        }),
      );
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
});
