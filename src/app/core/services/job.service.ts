import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JobApplication, JobOffer, JobRecommendationResponse } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/jobs`;

  // Métodos usados en la vista /jobs
  search(keyword: string, modality: string, experience: string): Observable<JobOffer[]> {
    let params = new HttpParams();
    if (keyword.trim()) {
      params = params.set('keyword', keyword.trim());
    }
    if (modality) {
      params = params.set('modality', modality);
    }
    if (experience) {
      params = params.set('experience', experience);
    }
    return this.http.get<JobOffer[]>(this.API_URL, { params });
  }

  recommendations(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.API_URL}/recommendations`);
  }

  dismiss(jobId: string): Observable<string> {
    return this.http.post(`${this.API_URL}/${jobId}/not-interested`, {}, { responseType: 'text' });
  }

  apply(jobId: string): Observable<JobApplication> {
    return this.http.post<JobApplication>(`${this.API_URL}/${jobId}/apply`, {});
  }

  myApplications(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.API_URL}/applications/me`);
  }

  // Métodos usados en el Dashboard (/feed)
  getRecommendations(): Observable<JobRecommendationResponse[]> {
    return this.http.get<JobRecommendationResponse[]>(`${this.API_URL}/recommendations`);
  }

  applyToJob(jobId: string): Observable<boolean> {
    return this.http.post<JobApplication>(`${this.API_URL}/${jobId}/apply`, {}).pipe(
      map(() => true)
    );
  }

  dismissRecommendation(jobId: string): Observable<boolean> {
    return this.http.post(`${this.API_URL}/${jobId}/not-interested`, {}, { responseType: 'text' }).pipe(
      map(() => true)
    );
  }
}