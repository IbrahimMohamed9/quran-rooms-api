import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { CustomLoggerService } from '../../logger/logger.service';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('WsJwtAuthGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();

      // Try to get token from handshake auth or headers
      let token = client.handshake.auth?.token;

      if (!token && client.handshake.headers?.authorization) {
        const authHeader = client.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.slice(7);
        }
      }

      if (!token) {
        this.logger.warn('No token found in WebSocket connection');
        return false;
      }

      // Verify token
      const payload = this.jwtService.verify(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      });

      const userId = payload?.id ?? payload?.sub;

      if (!payload || !userId) {
        this.logger.warn('Invalid token payload');
        return false;
      }

      // Get user from database
      const user = await this.usersRepo.findOne({
        where: { id: userId },
        relations: ['role', 'role.permissions'],
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found`);
        return false;
      }

      // Add user permissions to the user object
      const rolePermissions = user.role?.permissions;
      const permissions = Array.isArray(rolePermissions)
        ? rolePermissions.map((p: any) => `${p.resource}:${p.action}`)
        : [];

      // Store permissions in client data along with user
      client.data.permissions = permissions;

      // Store user in client data
      client.data.user = user;

      return true;
    } catch (error) {
      this.logger.error('Error in WsJwtAuthGuard', error);
      return false;
    }
  }
}
