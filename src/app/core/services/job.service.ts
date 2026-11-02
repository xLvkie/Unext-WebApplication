import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  ApplicationStatus, JobApplication, JobOffer, 
  JobOfferRequest, JobOfferUpdate, JobRecommendationResponse, 
  RecruiterApplicantFilters, RecruiterApplicationItem 
} from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);
  // Api de uso general para postulantes, reclutadores e instituciones
  private readonly JOBS_URL = `${environment.apiUrl}/jobs`;
  // Api de uso privado para reclutadores
  private readonly RECRUITER_URL = `${environment.apiUrl}/recruiter`;

  /* =============================================================
     SEARCH AND APPLICATIONS - USO DE API PÚBLICA PARA POSTULANTES
     ============================================================= */
  search(keyword: string, JobModality: string, experience: string): Observable<JobOffer[]> {
    let params = new HttpParams();
    if (keyword.trim()) {
      params = params.set('keyword', keyword.trim());
    }
    if (JobModality) {
      params = params.set('modality', JobModality);
    }
    if (experience) {
      params = params.set('experience', experience);
    }
    return this.http.get<JobOffer[]>(this.JOBS_URL, { params });
  }

  recommendations(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.JOBS_URL}/recommendations`);
  }

  dismiss(jobId: string): Observable<string> {
    return this.http.post(`${this.JOBS_URL}/${jobId}/not-interested`, {}, { responseType: 'text' });
  }

  apply(jobId: string): Observable<JobApplication> {
    return this.http.post<JobApplication>(`${this.JOBS_URL}/${jobId}/apply`, {});
  }

  myApplications(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.JOBS_URL}/applications/me`);
  }

  // Métodos usados en el Dashboard (/feed) falta desarrollar la paginación y filtros
  getRecommendations(): Observable<JobRecommendationResponse[]> {
    return this.http.get<JobRecommendationResponse[]>(`${this.JOBS_URL}/recommendations`);
  }

  applyToJob(jobId: string): Observable<boolean> {
    return this.http.post<JobApplication>(`${this.JOBS_URL}/${jobId}/apply`, {}).pipe(
      map(() => true)
    );
  }

  dismissRecommendation(jobId: string): Observable<boolean> {
    return this.http.post(`${this.JOBS_URL}/${jobId}/not-interested`, {}, { responseType: 'text' }).pipe(
      map(() => true)
    );
  }

  /* ================================================================
     RECRUITER JOBS MANAGEMENT - USO DE API PRIVADA PARA RECLUTADORES
     ================================================================ */
  getMyRecruiterJobs(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.RECRUITER_URL}/jobs`);
  }

  createRecruiterJob(payload: JobOfferRequest): Observable<JobOffer> {
    return this.http.post<JobOffer>(`${this.RECRUITER_URL}/jobs`, payload);
  }

  updateRecruiterJob(jobId: string, payload: JobOfferUpdate): Observable<JobOffer> {
    return this.http.put<JobOffer>(`${this.RECRUITER_URL}/jobs/${jobId}`, payload);
  }

  closeRecruiterJob(jobId: string): Observable<JobOffer> {
    return this.http.delete<JobOffer>(`${this.RECRUITER_URL}/jobs/${jobId}`);
  }

  getJobApplicationsForRecruiter(
    jobId: string,
    filters?: RecruiterApplicantFilters
  ): Observable<RecruiterApplicationItem[]> {
    let params = new HttpParams();
    if (filters?.career?.trim()) params = params.set('career', filters.career.trim());
    if (filters?.minCycle) params = params.set('minCycle', String(filters.minCycle));
    if (filters?.skill?.trim()) params = params.set('skill', filters.skill.trim());
    if (filters?.minRating) params = params.set('minRating', String(filters.minRating));
    if (filters?.minReviews) params = params.set('minReviews', String(filters.minReviews));

    return this.http.get<RecruiterApplicationItem[]>(
      `${this.RECRUITER_URL}/jobs/${jobId}/applications`,
      { params }
    );
  }

  updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Observable<string> {
    const params = new HttpParams().set('status', status);
    return this.http.patch(
      `${this.RECRUITER_URL}/applications/${applicationId}/status`,
      {},
      { params, responseType: 'text' }
    );
  }

  suggestSkills(query: string): Observable<string[]> {
    const params = new HttpParams().set('query', query.trim());
    return this.http
      .get<string[]>(`${this.RECRUITER_URL}/skills/suggestions`, { params })
      .pipe(catchError(() => of([])));
  }
}