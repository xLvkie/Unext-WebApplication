import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { PostulantProfileResponse } from '../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/profiles';

  private mockProfile: PostulantProfileResponse = {
    id: 'prof-101',
    userId: 'usr-me',
    firstName: 'Alejandro',
    lastName: 'Morales',
    studentCode: 'u202012345',
    career: 'Ingeniería de Software',
    currentCycle: 8,
    headline: 'Estudiante de Ing. de Software · 8vo Ciclo | UPC',
    bio: 'Apasionado por el desarrollo web frontend y arquitecturas de microservicios.',
    hasUniversityBase: true,
    isInstitutionVerified: true,
    institutionProfile: 'Universidad Peruana de Ciencias Aplicadas (UPC)',
    skills: [
      { id: 'sk-1', name: 'Angular 17+', masteryLevel: 'AVANZADO', isValidatedByInstitution: true }
    ]
  };

  getMyProfile(): Observable<PostulantProfileResponse> {
    return this.http.get<PostulantProfileResponse>(`${this.API_URL}/postulant/me`).pipe(
      catchError(() => of(this.mockProfile))
    );
  }
}
