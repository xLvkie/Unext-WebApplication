import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AcademicVerificationRequest,
  SkillValidationRequest,
  SkillValidationResponse
} from '../models/validation.model';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/validations`;

  requestAcademicVerification(payload: AcademicVerificationRequest): Observable<string> {
    return this.http.post(`${this.API_URL}/me/academic-verification`, payload, {
      responseType: 'text'
    });
  }

  requestSkillValidation(payload: SkillValidationRequest): Observable<SkillValidationResponse> {
    return this.http.post<SkillValidationResponse>(`${this.API_URL}/request`, payload);
  }

  getMyValidations(): Observable<SkillValidationResponse[]> {
    return this.http
      .get<SkillValidationResponse[]>(`${this.API_URL}/me`)
      .pipe(catchError(() => of([])));
  }

  linkInstitution(institutionId: string): Observable<string> {
    return this.http.patch(
      `${this.API_URL}/me/institution/${institutionId}`,
      {},
      { responseType: 'text' }
    );
  }
}