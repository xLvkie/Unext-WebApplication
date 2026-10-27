import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, RegisterRequest, Session, UserRole } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/auth`;

  // Signal que usa el Navbar y pantallas de Auth
  currentUserRole = signal<UserRole | null>(this.getStoredRole());

  // Signal que contiene el token, userId, role y si el perfil está completo
  session = signal<Session | null>(this.loadStoredSession());

  login(credentials: LoginRequest): Observable<Session> {
    return this.http.post<Session>(`${this.API_URL}/login`, credentials).pipe(
      tap((res: Session) => {
        this.saveSession(res);
      })
    );
  }

  register(data: RegisterRequest): Observable<Session> {
    return this.http.post<Session>(`${this.API_URL}/register`, data).pipe(
      tap((res: Session) => {
        if (res && res.token) {
          this.saveSession(res, data.role);
        }
      })
    );
  }

  private saveSession(res: Partial<Session>, fallbackRole?: UserRole): void {
    if (!res.token) return;
    localStorage.setItem('unext_token', res.token);

    const decoded = this.decodeJwtPayload(res.token);
    const role: UserRole =
      res.role || decoded?.role || decoded?.authorities?.[0] || fallbackRole || 'POSTULANT';
    const userId: string = res.userId || decoded?.userId || decoded?.sub || '';
    const isProfileCompleted = Boolean(res.isProfileCompleted ?? decoded?.isProfileCompleted ?? false);

    localStorage.setItem('unext_role', role);
    localStorage.setItem('unext_user_id', userId);
    localStorage.setItem('unext_profile_completed', String(isProfileCompleted));

    this.currentUserRole.set(role);
    this.session.set({
      token: res.token,
      userId,
      role,
      isProfileCompleted
    });
  }

  private loadStoredSession(): Session | null {
    const token = localStorage.getItem('unext_token');
    if (!token) return null;

    const decoded = this.decodeJwtPayload(token);
    const role = (localStorage.getItem('unext_role') as UserRole) || decoded?.role || 'POSTULANT';
    const userId = localStorage.getItem('unext_user_id') || decoded?.userId || decoded?.sub || '';
    const isProfileCompleted = localStorage.getItem('unext_profile_completed') === 'true';

    return {
      token,
      userId,
      role,
      isProfileCompleted
    };
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
    localStorage.removeItem('unext_user_id');
    localStorage.removeItem('unext_profile_completed');
    this.currentUserRole.set(null);
    this.session.set(null);
  }
}