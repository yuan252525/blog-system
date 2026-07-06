export function getErrorMessage(err: unknown, fallback = '发生错误，请稍后重试'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string | string[] } } }).response;
    if (response?.data?.message) {
      const msg = response.data.message;
      return Array.isArray(msg) ? msg.join('; ') : msg;
    }
  }
  return fallback;
}
