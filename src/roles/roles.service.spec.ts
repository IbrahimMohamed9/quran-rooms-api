import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { Users } from '../users/entities/users.entity';
import { CustomLoggerService } from '../logger/logger.service';

describe('RolesService', () => {
  let service: RolesService;
  let mockRolesRepository: Record<string, jest.Mock>;
  let mockUsersRepository: Record<string, jest.Mock>;
  let mockLogger: Record<string, jest.Mock>;
  let mockTenantRepositoryProvider: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRolesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockUsersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      logError: jest.fn(),
    };

    mockTenantRepositoryProvider = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Role) {
          return Promise.resolve(mockRolesRepository);
        }
        if (entity === Users) {
          return Promise.resolve(mockUsersRepository);
        }
        return Promise.resolve({});
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {},
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = await module.resolve<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
