/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CustomLoggerService } from '../logger/logger.service';
import { handleError } from '../utils/error-handler.util';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { comparePasswords } from '../utils/password.util';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Role } from '../roles/entities/role.entity';

interface UserWithoutPassword {
  id: number;
  email: string;
  name: string;
  role: Role;
  roleId: number;
  phone: string;
  gender: string;
  country: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('AuthService');
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserWithoutPassword | null> {
    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: passwordField, ...result } = user;
      return result;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return handleError(
        err,
        [UnauthorizedException],
        'Failed to validate user',
        () => {
          this.logger.logError(err, 'AuthService.validateUser', { email });
        },
      );
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.generateToken(user);
    } catch (err) {
      return handleError(
        err,
        [UnauthorizedException, ForbiddenException],

        'Failed to login',
        () => {
          this.logger.logError(err, 'AuthService.login', {
            email: loginDto.email,
          });
        },
      );
    }
  }

  async register(createUserDto: CreateUserDto) {
    createUserDto.roleId = 1;
    const createdUser = await this.usersService.create(createUserDto);
    const userWithRole = await this.usersService.findOneWithPermissions(
      createdUser.id,
    );
    return this.generateToken(userWithRole);
  }

  generateToken(user: UserWithoutPassword) {
    const rolePermissions = user.role.permissions;

    const permissions: string[] = Object.entries(rolePermissions).flatMap(
      ([resource, actions]) =>
        actions.map((action: string) => `${resource}.${action}`),
    );

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      permissions,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        country: user.country,
        imageUrl: user.imageUrl,
        role: user.role,
      },
    };
  }

  async adminLogin(adminLoginDto: AdminLoginDto) {
    try {
      const user = await this.validateUser(
        adminLoginDto.email,
        adminLoginDto.password,
      );

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.role?.name === 'user') {
        throw new ForbiddenException(
          'Access denied. Admin privileges required.',
        );
      }

      return this.generateToken(user);
    } catch (err) {
      return handleError(
        err,
        [UnauthorizedException, ForbiddenException],
        'Failed to login as admin',
        () => {
          this.logger.logError(err, 'AuthService.adminLogin', {
            email: adminLoginDto.email,
          });
        },
      );
    }
  }
}
