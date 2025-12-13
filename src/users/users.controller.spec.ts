import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Users } from './entities/users.entity';
import { CustomLoggerService } from '../logger/logger.service';
import { ImageUploadHelper } from '../file-upload/helpers/image-upload.helper';
import { RolesService } from '../roles/roles.service';
import { TenantRepositoryProvider } from '../tenant/tenant-repository.provider';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(Users),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: TenantRepositoryProvider,
          useValue: {
            getRepository: jest.fn().mockImplementation(() =>
              Promise.resolve({
                find: jest.fn(),
                findOne: jest.fn(),
                create: jest.fn(),
                save: jest.fn(),
                update: jest.fn(),
                remove: jest.fn(),
              }),
            ),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            logError: jest.fn(),
          },
        },
        {
          provide: ImageUploadHelper,
          useValue: {
            extractImageUrl: jest
              .fn()
              .mockReturnValue('http://example.com/image.jpg'),
          },
        },
        {
          provide: RolesService,
          useValue: {
            assignRoleToUser: jest.fn(),
            findById: jest.fn(),
            findByName: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'SUPER_ADMIN_API') {
                return 'http://localhost:3030/api/super-admin';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
