import axios from 'axios';
import type { ApiResponse, ApiErrorResponse } from '../types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  timeout: 60_000, // 分片上传需要更长超时
  headers: { 'Content-Type': 'application/json' },
  // 对于 FormData：让浏览器自动设置 Content-Type（含 boundary）
  // 对于 JSON 对象：手动序列化，保留 axios 默认的 JSON 序列化行为
  transformRequest: [(data, headers) => {
    if (data instanceof FormData) {
      delete headers['Content-Type'];
      return data;
    }
    headers['Content-Type'] = 'application/json';
    return JSON.stringify(data);
  }],
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    // 后端统一格式 { statusCode, message, data, timestamp }
    // 解包后只返回 data 部分，让调用方拿到业务数据
    if (body && typeof body === 'object' && 'statusCode' in body && 'data' in body) {
      return body.data;
    }
    // 兜底：如果后端没走拦截器（如第三方接口），原样返回
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // 提取后端统一错误格式 { statusCode, message, data, timestamp, path }
    const errBody = error.response?.data as ApiErrorResponse | undefined;
    if (errBody && errBody.message) {
      error.message = errBody.message;
    }

    return Promise.reject(error);
  },
);

export default apiClient;
