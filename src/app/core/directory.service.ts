import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { Contact } from './models';

interface NamedUser {
  userId?: string;
  firstName?: string;
  lastName?: string;
  career?: string;
  companyName?: string;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly http = inject(HttpClient);

  readonly contacts = signal<Contact[]>([]);
  readonly names = signal<Record<string, string>>({});

  load(): Observable<Contact[]> {
    return forkJoin({
      postulants: this.http
        .get<NamedUser[]>(`${environment.apiUrl}/profiles/postulants/directory`)
        .pipe(catchError(() => of([] as NamedUser[]))),
      recruiters: this.http
        .get<NamedUser[]>(`${environment.apiUrl}/recruiter/directory`)
        .pipe(catchError(() => of([] as NamedUser[]))),
      institutions: this.http
        .get<NamedUser[]>(`${environment.apiUrl}/institution/directory`)
        .pipe(catchError(() => of([] as NamedUser[]))),
    }).pipe(
      map((data) => {
        const contacts = [
          ...data.postulants.map((item) => this.contact(item, 'Postulante', item.career ?? 'Estudiante', this.person(item))),
          ...data.recruiters.map((item) => this.contact(item, 'Empresa', 'Reclutador', item.companyName ?? 'Empresa')),
          ...data.institutions.map((item) => this.contact(item, 'Institución', 'Institución', item.name ?? 'Institución')),
        ].filter((item) => item.userId);
        const names: Record<string, string> = {};
        for (const contact of contacts) {
          names[contact.userId] = contact.name;
        }
        this.contacts.set(contacts);
        this.names.set(names);
        return contacts;
      }),
      catchError(() => of([] as Contact[])),
    );
  }

  nameOf(userId: string): string {
    return this.names()[userId] ?? 'Usuario';
  }

  private person(item: NamedUser): string {
    return [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Postulante';
  }

  private contact(item: NamedUser, kind: Contact['kind'], subtitle: string, name: string): Contact {
    return {
      userId: item.userId ?? '',
      name,
      subtitle,
      kind,
    };
  }
}
