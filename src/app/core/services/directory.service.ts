import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Contact } from '../models/chat.model';

interface NamedUser {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  career?: string;
  headline?: string;
  avatarUrl?: string | null;
  companyName?: string;
  industry?: string;
  companyLogoUrl?: string | null;
  name?: string;
  domain?: string;
  logoUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly http = inject(HttpClient);

  readonly contacts = signal<Contact[]>([]);
  readonly names = signal<Record<string, string>>({});
  readonly avatars = signal<Record<string, string | null>>({});

  load(): Observable<Contact[]> {
    return forkJoin({
      postulants: this.http
        .get<NamedUser[]>(`${environment.apiUrl}/profiles/postulants/directory`)
        .pipe(catchError(() => of([] as NamedUser[]))),
      recruiters: this.http
        .get<NamedUser[]>(`${environment.apiUrl}/profiles/directory`)
        .pipe(catchError(() => of([] as NamedUser[]))),
      institutions: this.http
        .get<NamedUser[]>(`${environment.apiUrl}/profiles/institution/directory`)
        .pipe(catchError(() => of([] as NamedUser[]))),
    }).pipe(
      map((data) => {
        const contacts = [
          ...data.postulants.map((item) =>
            this.contact(
              item,
              'Postulante',
              item.career || item.headline || 'Estudiante',
              this.person(item),
              item.avatarUrl || null
            )
          ),
          ...data.recruiters.map((item) =>
            this.contact(
              item,
              'Empresa',
              item.industry || 'Reclutador',
              item.companyName ?? 'Empresa',
              item.companyLogoUrl || null
            )
          ),
          ...data.institutions.map((item) =>
            this.contact(
              item,
              'Institución',
              item.domain || 'Institución',
              item.name ?? 'Institución',
              item.logoUrl || null
            )
          ),
        ].filter((item) => item.userId);

        const names: Record<string, string> = {};
        const avatars: Record<string, string | null> = {};

        for (const contact of contacts) {
          names[contact.userId] = contact.name;
          avatars[contact.userId] = contact.avatarUrl ?? null;
        }

        this.contacts.set(contacts);
        this.names.set(names);
        this.avatars.set(avatars);
        return contacts;
      }),
      catchError(() => of([] as Contact[]))
    );
  }

  dailyCommunityPeers(excludeUserId?: string | null, limit = 6): Contact[] {
    const pool = this.contacts().filter(
      (c) => c.userId && c.userId !== excludeUserId
    );
    if (pool.length <= limit) {
      return pool;
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    let daySeed = 0;
    for (let i = 0; i < todayKey.length; i++) {
      daySeed = (daySeed * 31 + todayKey.charCodeAt(i)) >>> 0;
    }

    const scored = pool.map((contact, idx) => {
      let hash = daySeed ^ ((idx + 1) * 2654435761);
      for (let i = 0; i < contact.userId.length; i++) {
        hash = Math.imul(hash ^ contact.userId.charCodeAt(i), 16777619) >>> 0;
      }
      return { contact, score: hash };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, limit).map((item) => item.contact);
  }

  nameOf(userId: string): string {
    return this.names()[userId] ?? 'Usuario';
  }

  avatarOf(userId: string): string | null {
    return this.avatars()[userId] ?? null;
  }

  registerContactInfo(userId: string, name: string, avatarUrl?: string | null): void {
    if (!userId) return;
    this.names.update((prev) => ({ ...prev, [userId]: name || prev[userId] || 'Usuario' }));
    if (avatarUrl !== undefined) {
      this.avatars.update((prev) => ({ ...prev, [userId]: avatarUrl }));
    }
  }

  private person(item: NamedUser): string {
    return [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Postulante';
  }

  private contact(
    item: NamedUser,
    kind: Contact['kind'],
    subtitle: string,
    name: string,
    avatarUrl: string | null
  ): Contact {
    return {
      userId: item.userId ?? '',
      profileId: item.id,
      name,
      subtitle,
      kind,
      avatarUrl,
    };
  }
}