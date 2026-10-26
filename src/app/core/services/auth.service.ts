import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserRole } from '../models/auth.model';

// El servicio de autenticación maneja el inicio de sesión, registro y almacenamiento de tokens y roles 
// en el almacenamiento local del navegador. Contiene las peticioes HTTP necesarias para interactuar con la 
// API de autenticación y proporciona métodos para obtener el token y el rol del usuario actual.

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/auth';

  currentUserRole = signal<UserRole | null>(this.getStoredRole());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, data).pipe(
      tap((res) => {
        if (res && res.token) {
          this.saveSession(res, data.role);
        }
      })
    );
  }

  private saveSession(res: AuthResponse, fallbackRole?: UserRole): void {
    if (!res.token) return;
    localStorage.setItem('unext_token', res.token);

    const decoded = this.decodeJwtPayload(res.token);
    const role: UserRole = res.role || decoded?.role || decoded?.authorities?.[0] || fallbackRole || 'POSTULANT';

    localStorage.setItem('unext_role', role);
    this.currentUserRole.set(role);
  }

  private decodeJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('unext_token');
  }

  getStoredRole(): UserRole | null {
    return (localStorage.getItem('unext_role') as UserRole) || null;
  }

  logout(): void {
    localStorage.removeItem('unext_token');
    localStorage.removeItem('unext_role');
    this.currentUserRole.set(null);
  }
}