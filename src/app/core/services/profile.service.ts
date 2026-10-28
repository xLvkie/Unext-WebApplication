import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InstitutionProfileResponse,
  PostulantProfileResponse,
  PostulantProfileUpdateRequest,
  RecruiterProfileResponse,
  SkillRequest,
  StudentSkillResponse,
} from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}`;

  getMyPostulantProfile(): Observable<PostulantProfileResponse> {
    return this.http.get<PostulantProfileResponse>(`${this.API_URL}/profiles/postulant/me`);
  }

  getMyRecruiterProfile(): Observable<RecruiterProfileResponse> {
    return this.http.get<RecruiterProfileResponse>(`${this.API_URL}/profiles/recruiter/me`);
  }

  getMyInstitutionProfile(): Observable<InstitutionProfileResponse> {
    return this.http.get<InstitutionProfileResponse>(`${this.API_URL}/profiles/institution/me`);
  }

  updateMyPostulantProfile(
    changes: PostulantProfileUpdateRequest,
  ): Observable<PostulantProfileResponse> {
    return this.http.put<PostulantProfileResponse>(
      `${this.API_URL}/profiles/postulant/me`,
      changes,
    );
  }

  addSkill(skill: SkillRequest): Observable<StudentSkillResponse> {
    return this.http.post<StudentSkillResponse>(
      `${this.API_URL}/profiles/postulant/me/skills`,
      skill,
    );
  }

  deleteSkill(skillId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/profiles/postulant/me/skills/${skillId}`);
  }
}
