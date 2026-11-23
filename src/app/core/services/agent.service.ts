import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, defer, finalize, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgentChatRequest,
  AgentChatResponse,
  BioOptimizeRequest,
  BioOptimizeResponse,
  EmployabilityInsightsRequest,
  EmployabilityInsightsResponse,
  JobBlueprintSuggestion,
  JobDesignRequest,
  JobSuggestionListResponse,
  TalentAnalysisRequest,
  TalentAnalysisResponse
} from '../models/agent.model';
import { ExperienceLevel, JobModality } from '../models/job.model';
import { readApiError } from '../utils/api-error';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/agent`;

  private readonly activeRequests = signal(0);
  readonly isLoading = computed(() => this.activeRequests() > 0);
  readonly error = signal<string | null>(null);
  readonly pendingJobBlueprint = signal<JobBlueprintSuggestion | null>(null);

  chat(message: string): Observable<AgentChatResponse> {
    const payload: AgentChatRequest = { message: message.trim() };
    return this.trackRequest(
      () => this.http.post<AgentChatResponse>(`${this.API_URL}/chat`, payload),
      'No se pudo obtener respuesta del asistente de IA.'
    );
  }

  suggest(message: string): Observable<JobSuggestionListResponse> {
    const payload: AgentChatRequest = { message: message.trim() };
    return this.trackRequest(
      () => this.http.post<JobSuggestionListResponse>(`${this.API_URL}/suggest`, payload),
      'No se pudieron generar sugerencias con IA.'
    );
  }

  optimizeBio(bio: string): Observable<BioOptimizeResponse> {
    const payload: BioOptimizeRequest = { bio: bio.trim() };
    return this.trackRequest(
      () => this.http.post<BioOptimizeResponse>(`${this.API_URL}/optimize-bio`, payload),
      'No se pudo optimizar el texto con IA.'
    );
  }

  analyzePostulantTalent(req?: TalentAnalysisRequest): Observable<TalentAnalysisResponse> {
    const cleanTargetRole = req?.targetRole?.trim();
    const payload: TalentAnalysisRequest = cleanTargetRole
      ? { targetRole: cleanTargetRole }
      : {};
    return this.trackRequest(
      () =>
        this.http.post<TalentAnalysisResponse>(
          `${this.API_URL}/postulant/talent-analysis`,
          payload
        ),
      'No se pudo generar el análisis de compatibilidad con IA.'
    );
  }

  designJob(prompt: string): Observable<JobBlueprintSuggestion> {
    const payload: JobDesignRequest = { prompt: prompt.trim() };
    return this.trackRequest(
      () => this.http.post<JobBlueprintSuggestion>(`${this.API_URL}/recruiter/design-job`, payload),
      'No se pudo diseñar la propuesta de vacante con IA.'
    );
  }

  generateEmployabilityInsights(
    req?: EmployabilityInsightsRequest
  ): Observable<EmployabilityInsightsResponse> {
    const cleanCareer = req?.career?.trim();
    const cleanQuestion = req?.focusQuestion?.trim();
    const payload: EmployabilityInsightsRequest = {};
    if (cleanCareer) {
      payload.career = cleanCareer;
    }
    if (cleanQuestion) {
      payload.focusQuestion = cleanQuestion;
    }

    return this.trackRequest(
      () =>
        this.http.post<EmployabilityInsightsResponse>(
          `${this.API_URL}/institution/employability-insights`,
          payload
        ),
      'No se pudo generar el diagnóstico de empleabilidad con IA.'
    );
  }

  setPendingJobBlueprint(blueprint: JobBlueprintSuggestion | null): void {
    this.pendingJobBlueprint.set(blueprint);
  }

  consumePendingJobBlueprint(): JobBlueprintSuggestion | null {
    const current = this.pendingJobBlueprint();
    if (current) {
      this.pendingJobBlueprint.set(null);
    }
    return current;
  }

  normalizeModality(raw?: string | null): JobModality {
    const normalized = (raw || '').trim().toUpperCase();
    if (normalized === 'REMOTE') return 'REMOTE';
    if (normalized === 'ONSITE' || normalized === 'ON_SITE') return 'ONSITE';
    return 'HYBRID';
  }

  normalizeExperienceLevel(raw?: string | null): ExperienceLevel {
    const normalized = (raw || '').trim().toUpperCase();
    if (normalized === 'TRAINEE' || normalized === 'INTERNSHIP') return 'TRAINEE';
    if (normalized === 'JUNIOR' || normalized === 'ENTRY_LEVEL') return 'JUNIOR';
    if (normalized === 'SEMI_SENIOR' || normalized === 'MID') return 'SEMI_SENIOR';
    if (normalized === 'SENIOR') return 'SENIOR';
    return 'TRAINEE';
  }

  parseSalaryRangeSoles(
    rangeText?: string | null
  ): { minSalary: number | null; maxSalary: number | null } {
    if (!rangeText) {
      return { minSalary: null, maxSalary: null };
    }
    const matches = rangeText.match(/\d[\d,]*(?:\.\d+)?/g) || [];
    const values = matches
      .map((token) => Math.round(Number(token.replace(/,/g, ''))))
      .filter((num) => Number.isFinite(num) && num >= 100);

    if (values.length === 0) {
      return { minSalary: null, maxSalary: null };
    }
    if (values.length === 1) {
      return { minSalary: values[0], maxSalary: null };
    }
    return {
      minSalary: Math.min(values[0], values[1]),
      maxSalary: Math.max(values[0], values[1])
    };
  }

  private trackRequest<T>(factory: () => Observable<T>, fallbackError: string): Observable<T> {
    return defer(() => {
      this.activeRequests.update((count) => count + 1);
      this.error.set(null);
      return factory();
    }).pipe(
      catchError((err: unknown) => {
        this.error.set(readApiError(err, fallbackError));
        return throwError(() => err);
      }),
      finalize(() => {
        this.activeRequests.update((count) => Math.max(0, count - 1));
      })
    );
  }
}
