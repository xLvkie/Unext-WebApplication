import { HttpErrorResponse } from '@angular/common/http';

export function readApiError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Revisa que el backend esté corriendo en el puerto 8080.';
  }
  if (error.status === 401) {
    return 'Tu sesión expiró o no es válida. Vuelve a ingresar.';
  }
  const body = error.error;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record['detail'] === 'string' && record['detail'].trim()) {
      return record['detail'];
    }
    if (typeof record['message'] === 'string' && record['message'].trim() && record['message'] !== 'No message available') {
      return record['message'];
    }
  }
  if (error.status === 403) {
    return 'No tienes permiso para hacer esta acción.';
  }
  return fallback;
}
