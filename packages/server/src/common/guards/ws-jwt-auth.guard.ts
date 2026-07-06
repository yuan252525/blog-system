import { Injectable, type CanActivate, type ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`No token found for client ${client.id}, handshake.auth=`, client.handshake?.auth);
      return false;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.data.user = payload;
      this.logger.log(`Token verified for user ${payload.sub} (${payload.username})`);
      return true;
    } catch (err) {
      this.logger.warn(`Token verification failed for client ${client.id}: ${(err as Error).message}`);
      return false;
    }
  }

  private extractToken(client: any): string | undefined {
    // socket.io auth token (from handshake)
    const auth = client.handshake?.auth?.token;
    if (auth) return auth.startsWith('Bearer ') ? auth.slice(7) : auth;

    // query parameter fallback
    const query = client.handshake?.query?.token;
    if (query) return query;

    return undefined;
  }
}
