/** 后端统一响应格式 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

/** 错误响应格式 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  data: null;
  timestamp: string;
  path: string;
}
