import { Injectable, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 可选 JWT 认证 Guard
 * - 请求带有有效 token → req.user 被填充
 * - 请求无 token 或 token 无效 → 正常通过，req.user 为 undefined
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch {
      // Token 无效或不存在，允许通过
      return true;
    }
  }

  handleRequest<TUser = any>(err: any, user: TUser): TUser {
    // 返回 user（可能是 undefined），不抛出异常
    return user;
  }
}
