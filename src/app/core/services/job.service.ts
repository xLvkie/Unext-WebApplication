import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { JobRecommendationResponse } from '../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/jobs';

  private mockRecommendations: JobRecommendationResponse[] = [
    {
      id: 'job-101',
      title: 'Practicante Frontend Angular / TypeScript',
      companyName: 'BCP Innovación Digital',
      companyLogoUrl: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=100&auto=format&fit=crop&q=80',
      description: 'Súmate a la transformación de canales digitales bancarios con metodologías ágiles, Angular 17+ y buenas prácticas.',
      location: 'Lima, Perú (Híbrido - San Isidro)',
      modality: 'HYBRID',
      experienceLevel: 'INTERNSHIP',
      minSalary: 1400,
      maxSalary: 1900,
      requiredSkills: ['Angular', 'TypeScript', 'Tailwind CSS', 'Git'],
      matchedSkills: ['Angular', 'TypeScript', 'Git'],
      compatibilityPercent: 96,
      compatibilityLabel: 'Alta Afinidad',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      isApplied: false,
      isSaved: false
    }
  ];

  getRecommendations(): Observable<JobRecommendationResponse[]> {
    return this.http.get<JobRecommendationResponse[]>(`${this.API_URL}/recommendations`).pipe(
      catchError(() => of(this.mockRecommendations))
    );
  }

  applyToJob(jobId: string): Observable<boolean> {
    return this.http.post(`${this.API_URL}/${jobId}/apply`, {}).pipe(
      map(() => true),
      catchError(() => {
        const item = this.mockRecommendations.find((j) => j.id === jobId);
        if (item) item.isApplied = true;
        return of(true);
      })
    );
  }

  dismissRecommendation(jobId: string): Observable<boolean> {
    return this.http.post(`${this.API_URL}/${jobId}/not-interested`, {}).pipe(
      map(() => true),
      catchError(() => {
        this.mockRecommendations = this.mockRecommendations.filter((j) => j.id !== jobId);
        return of(true);
      })
    );
  }

  toggleSaveJob(jobId: string): Observable<boolean> {
    const item = this.mockRecommendations.find((j) => j.id === jobId);
    if (item) item.isSaved = !item.isSaved;
    return of(item ? !!item.isSaved : false);
  }
}
