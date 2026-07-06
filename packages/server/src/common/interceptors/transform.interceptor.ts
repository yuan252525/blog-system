import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';

/**
 * 统一成功响应格式
 */
interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * 根据 HTTP 方法推导默认状态码和消息
 */
function getDefaultResponse(method: string): {
  statusCode: number;
  message: string;
} {
  switch (method.toUpperCase()) {
    case 'POST':
      return { statusCode: HttpStatus.CREATED, message: 'Created successfully' };
    case 'DELETE':
      return { statusCode: HttpStatus.OK, message: 'Deleted successfully' };
    case 'PUT':
    case 'PATCH':
      return { statusCode: HttpStatus.OK, message: 'Updated successfully' };
    case 'GET':
      return { statusCode: HttpStatus.OK, message: 'Success' };
    default:
      return { statusCode: HttpStatus.OK, message: 'Success' };
  }
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;

    // 如果 controller 手动设置了状态码（如 @HttpCode），优先使用
    // 否则根据方法类型推导
    const defaultResp = getDefaultResponse(method);
    const statusCode =
      response.statusCode === HttpStatus.OK
        ? defaultResp.statusCode
        : response.statusCode;

    return next.handle().pipe(
      map((data) => {
        // 如果返回值已经是 ApiResponse 格式，不再二次包装
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'data' in data
        ) {
          return data as unknown as ApiResponse<T>;
        }

        return {
          statusCode,
          message: defaultResp.message,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
