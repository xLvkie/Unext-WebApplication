import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthResponse, Role, Session } from './models';

const STORAGE_KEY = 'unext.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly session = signal<Session | null>(this.read());
  readonly displayName = signal('Mi cuenta');

  token(): string | null {
    return this.session()?.token ?? null;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((response) => {
        const session: Session = {
          token: response.token,
          userId: response.userId,
          role: response.role,
          isProfileCompleted: response.isProfileCompleted,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        this.session.set(session);
        this.hydrate();
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.displayName.set('Mi cuenta');
  }

  hydrate(): void {
    const session = this.session();
    if (!session) {
      return;
    }
    const url = this.profileUrl(session.role);
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (profile) => this.displayName.set(this.nameFromProfile(profile)),
      error: () => this.displayName.set('Mi cuenta'),
    });
  }

  private profileUrl(role: Role): string {
    if (role === 'RECRUITER') {
      return `${environment.apiUrl}/profiles/recruiter/me`;
    }
    if (role === 'INSTITUTION') {
      return `${environment.apiUrl}/profiles/institution/me`;
    }
    return `${environment.apiUrl}/profiles/postulant/me`;
  }

  private nameFromProfile(profile: Record<string, unknown>): string {
    const company = this.text(profile['companyName']);
    const institution = this.text(profile['name']);
    const person = [this.text(profile['firstName']), this.text(profile['lastName'])].filter(Boolean).join(' ');
    return company || person || institution || 'Mi cuenta';
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private read(): Session | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Session;
      if (!parsed.token || !parsed.userId) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
