import { HttpInterceptorFn } from '@angular/common/http';

// Este interceptor se encarga de agregar el token JWT a las solicitudes HTTP salientes, excepto 
// para las rutas de autenticación. Mantiene el token en el almacenamiento local y lo adjunta al 
// encabezado Authorization de las solicitudes HTTP.

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('unext_token');

  if (token && !req.url.includes('/api/auth/')) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token.trim()}`
      }
    });
    return next(cloned);
  }

  return next(req);
};