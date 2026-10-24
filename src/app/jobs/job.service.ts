import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { JobApplication, JobOffer } from '../core/models';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);

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
    return this.http.get<JobOffer[]>(`${environment.apiUrl}/jobs`, { params });
  }

  recommendations(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${environment.apiUrl}/jobs/recommendations`);
  }

  dismiss(jobId: string): Observable<string> {
    return this.http.post(`${environment.apiUrl}/jobs/${jobId}/not-interested`, {}, { responseType: 'text' });
  }

  apply(jobId: string): Observable<JobApplication> {
    return this.http.post<JobApplication>(`${environment.apiUrl}/jobs/${jobId}/apply`, {});
  }

  myApplications(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${environment.apiUrl}/jobs/applications/me`);
  }
}
