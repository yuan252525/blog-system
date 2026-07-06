import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) return false;

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.data.user = payload;
      return true;
    } catch {
      return false;
    }
  }

  private extractToken(client: any): string | undefined {
    // socket.io auth token
    const auth = client.handshake?.auth?.token;
    if (auth) return auth.startsWith('Bearer ') ? auth.slice(7) : auth;

    // query parameter fallback
    const query = client.handshake?.query?.token;
    if (query) return query;

    return undefined;
  }
}
