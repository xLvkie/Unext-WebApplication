import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InstitutionSummary,
  PostulantProfileRequest,
  PostulantProfileResponse,
  PostulantProfileUpdate,
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
     RECRUITER & INSTITUTION PROFILE
  ============================== */
  getMyRecruiterProfile(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/recruiter/me`);
  }

  getMyInstitutionProfile(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/institution/me`);
  }

  getInstitutionsDirectory(): Observable<InstitutionSummary[]> {
    return this.http
      .get<InstitutionSummary[]>(`${this.API_URL}/institutions/directory`)
      .pipe(catchError(() => of([])));
  }

  verifyOrganization(code: string): Observable<string> {
    return this.http.post(
      `${this.API_URL}/organization/verify`,
      { code },
      { responseType: 'text' }
    );
  }
}