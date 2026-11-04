import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

export const roleGuard = (...allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.getToken()) {
      return router.createUrlTree(['/login']);
    }

    const currentRole = (authService.getStoredRole() || 'POSTULANT') as UserRole;

    if (allowedRoles.includes(currentRole)) {
      return true;
    }

    // Si intenta acceder por URL a una página de otro segmento, lo redirigimos a su inicio
    return router.createUrlTree(['/feed']);
  };
};