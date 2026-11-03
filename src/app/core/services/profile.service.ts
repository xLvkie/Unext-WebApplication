import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InstitutionProfileRequest,
  InstitutionProfileResponse,
  InstitutionProfileUpdate,
  InstitutionSummary,
  PostulantProfileRequest,
  PostulantProfileResponse,
  PostulantProfileUpdate,
  RecruiterProfileResponse,
  RecruiterProfileUpdate,
  RecruiterProfileRequest,
  StudentSkillRequest,
  StudentSkillResponse,
  StudentSkillUpdate
} from '../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/profiles`;
  private readonly recruiterApi = `${environment.apiUrl}/recruiter`;

  /* ==============================
     POSTULANT PROFILE
     ============================== */
  getMyPostulantProfile(): Observable<PostulantProfileResponse> {
    return this.http.get<PostulantProfileResponse>(`${this.API_URL}/postulant/me`);
  }

  createPostulantProfile(request: PostulantProfileRequest): Observable<PostulantProfileResponse> {
    return this.http
      .post(`${this.API_URL}/postulant/me`, request, { responseType: 'text' })
      .pipe(switchMap(() => this.getMyPostulantProfile()));
  }

  updatePostulantProfile(request: PostulantProfileUpdate): Observable<PostulantProfileResponse> {
    return this.http.put<PostulantProfileResponse>(`${this.API_URL}/postulant/me`, request);
  }

  addSkill(request: StudentSkillRequest): Observable<StudentSkillResponse> {
    return this.http.post<StudentSkillResponse>(`${this.API_URL}/postulant/me/skills`, request);
  }

  getMySkills(): Observable<StudentSkillResponse[]> {
    return this.http.get<StudentSkillResponse[]>(`${this.API_URL}/postulant/me/skills`);
  }

  updateSkill(skillId: string, request: StudentSkillUpdate): Observable<StudentSkillResponse> {
    return this.http.put<StudentSkillResponse>(
      `${this.API_URL}/postulant/me/skills/${skillId}`,
      request
    );
  }

  deleteSkill(skillId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/postulant/me/skills/${skillId}`);
  }

  /* ==============================
     RECRUITER PROFILE
     ============================== */
  getMyRecruiterProfile(): Observable<RecruiterProfileResponse> {
    return this.http.get<RecruiterProfileResponse>(`${this.API_URL}/recruiter/me`);
  }

  createRecruiterProfile(request: RecruiterProfileRequest): Observable<RecruiterProfileResponse> {
    return this.http
      .post(`${this.API_URL}/recruiter/me`, request, { responseType: 'text' })
      .pipe(switchMap(() => this.getMyRecruiterProfile()));
  }

  updateRecruiterProfile(request: RecruiterProfileUpdate): Observable<RecruiterProfileResponse> {
    return this.http.put<RecruiterProfileResponse>(`${this.API_URL}/recruiter/me`, request);
  }

  getRecruiterPublicJobs(recruiterId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.API_URL}/recruiters/directory/${recruiterId}/jobs`)
      .pipe(catchError(() => of([])));
  }

  /* ==============================
     INSTITUTION PROFILE
     ============================== */
  getMyInstitutionProfile(): Observable<InstitutionProfileResponse> {
    return this.http.get<InstitutionProfileResponse>(`${this.API_URL}/institution/me`);
  }

  createInstitutionProfile(request: InstitutionProfileRequest): Observable<string> {
    return this.http.post(`${this.API_URL}/institution/me`, request, { responseType: 'text' });
  }

  updateMyInstitutionProfile(request: InstitutionProfileUpdate): Observable<InstitutionProfileResponse> {
    return this.http.put<InstitutionProfileResponse>(`${this.API_URL}/institution/me`, request);
  }

  getInstitutionsDirectory(): Observable<InstitutionSummary[]> {
    return this.http
      .get<InstitutionSummary[]>(`${this.API_URL}/institution/directory`)
      .pipe(catchError(() => of([])));
  }

  verifyOrganization(code: string): Observable<string> {
    return this.http.post(
      `${this.API_URL}/organization/verify`,
      { code },
      { responseType: 'text' }
    );
  }

  /* =============================
     PUBLIC PROFILE VIEW (POR ID)
    ============================== */
  getPostulantPublicProfile(postulantId: string): Observable<PostulantProfileResponse> {
    return this.http.get<PostulantProfileResponse>(
      `${this.API_URL}/postulants/directory/${postulantId}`
    );
  }

  getRecruiterPublicProfile(recruiterId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/recruiters/directory/${recruiterId}`);
  }

  getInstitutionPublicProfile(institutionId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/institutions/directory/${institutionId}`);
  }
}