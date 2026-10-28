import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PostulantProfileResponse } from '../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}`;

  getMyPostulantProfile(): Observable<PostulantProfileResponse> {
    return this.http.get<PostulantProfileResponse>(`${this.API_URL}/profiles/postulant/me`);
  }

  getMyRecruiterProfile(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/profiles/recruiter/me`);
  }

  getMyInstitutionProfile(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/profiles/institution/me`);
  }
}