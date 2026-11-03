import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../shared/components/toast/toast';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { InstitutionProfileResponse, PostulantProfileResponse } from '../../core/models/profile.model';
import { readApiError } from '../../core/utils/api-error';

export interface DetailedStudentItem {
  postulantId: string;
  firstName: string;
  lastName: string;
  email: string;
  studentCode: string;
  career: string;
  currentCycle: number | null;
  isVerified: boolean;
  avatarUrl?: string | null;
  academicStatus?: string;
  evidenceUrl?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface DetailedSkillValidation {
  validationId: string;
  studentName: string;
  skillName: string;
  evidenceUrl?: string;
  status: string;
}

export interface CorporateAgreementItem {
  id: string;
  title: string;
  companyName: string;
  studentName: string;
  weeklyHours: number;
  startDate?: string;
  endDate?: string;
  status: string;
  documentUrl?: string;
  observations?: string;
}

export interface CareerDemandItem {
  career: string;
  applications: number;
  accepted: number;
}

export interface DashboardSummaryData {
  career?: string | null;
  totalVerifiedStudents: number;
  totalHiredStudents: number;
  totalActiveAgreements: number;
  totalEndorsedCompanies: number;
  employabilityRate: number;
  message?: string | null;
}

export interface TopCompanyItem {
  recruiterId: string;
  companyName: string;
  hiredStudents: number;
  isValidated: boolean;
}

@Component({
  selector: 'app-institution-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, Toast],
  templateUrl: './institution-portal.html'
})
export class InstitutionPortal implements OnInit {
  Math = Math;

  private http = inject(HttpClient);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Estados de carga
  isLoading = signal(true);
  isLoadingStudents = signal(false);
  isLoadingSkills = signal(false);
  isLoadingAgreements = signal(false);
  isLoadingAnalytics = signal(false);

  // Pestaña de servicio activa (alumnos, habilidades, convenios o métricas)
  activeTab = signal<'students' | 'skills' | 'agreements' | 'analytics'>('students');

  // Datos reales de la institución desde /api/institution/me
  institution = signal<InstitutionProfileResponse | null>(null);

  // Listas de datos recibidas directamente de los endpoints (sin inventar datos)
  students = signal<DetailedStudentItem[]>([]);
  skillValidations = signal<DetailedSkillValidation[]>([]);
  agreements = signal<CorporateAgreementItem[]>([]);

  // Datos de Métricas y Estadísticas de Empleabilidad (DashboardController)
  careerDemands = signal<CareerDemandItem[]>([]);
  analyticsSummary = signal<DashboardSummaryData | null>(null);
  topCompanies = signal<TopCompanyItem[]>([]);
  selectedAnalyticsCareer = signal<string>('ALL');

  maxDemandValue = computed(() => {
    const list = this.careerDemands();
    if (!list || list.length === 0) return 1;
    const max = Math.max(...list.map((c) => Math.max(c.applications || 0, c.accepted || 0)));
    return max > 0 ? max : 1;
  });

  // Filtros de Alumnos
  searchTerm = signal('');
  selectedCareer = signal('ALL');
  selectedCycle = signal('ALL');
  selectedStatus = signal('ALL'); // 'ALL' | 'PENDING' | 'APPROVED'
  sortBy = signal<'time_desc' | 'alpha_asc' | 'alpha_desc' | 'cycle_desc' | 'cycle_asc'>('time_desc');

  // Filtros de Habilidades
  skillSearchTerm = signal('');

  // Filtros de Convenios
  agreementSearchTerm = signal('');

  toast = signal<ToastData | null>(null);

  // Acciones en proceso
  processingStudentId = signal<string | null>(null);
  processingValidationId = signal<string | null>(null);
  processingAgreementId = signal<string | null>(null);

  // Lista dinámica de carreras presentes en la base de datos
  availableCareers = computed(() => {
    const list = this.students()
      .map((s) => s.career?.trim())
      .filter((c): c is string => Boolean(c) && c !== 'No especificada');
    return Array.from(new Set(list));
  });

  // Lista de ciclos para filtro
  availableCycles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Métricas reales
  stats = computed(() => {
    const allStudents = this.students();
    const pendingStudents = allStudents.filter((s) => !s.isVerified && s.status !== 'APPROVED').length;
    const approvedStudents = allStudents.filter((s) => s.isVerified || s.status === 'APPROVED').length;
    const pendingSkills = this.skillValidations().filter((sk) => sk.status === 'PENDING').length;
    const activeAgreements = this.agreements().filter((a) => a.status === 'ACTIVE' || a.status === 'APPROVED').length;

    return {
      pendingStudents,
      approvedStudents,
      totalStudents: allStudents.length,
      pendingSkills,
      activeAgreements
    };
  });

  // Lista filtrada y ordenada de Alumnos
  filteredStudents = computed(() => {
    let list = [...this.students()];
    const search = this.searchTerm().trim().toLowerCase();
    const career = this.selectedCareer();
    const cycle = this.selectedCycle();
    const status = this.selectedStatus();
    const sort = this.sortBy();

    // 1. Búsqueda por texto (nombre, código, correo, carrera)
    if (search) {
      list = list.filter((st) => {
        const full = `${st.firstName} ${st.lastName}`.toLowerCase();
        const code = (st.studentCode || '').toLowerCase();
        const email = (st.email || '').toLowerCase();
        const crr = (st.career || '').toLowerCase();
        return full.includes(search) || code.includes(search) || email.includes(search) || crr.includes(search);
      });
    }

    // 2. Filtro por carrera
    if (career !== 'ALL') {
      list = list.filter((st) => st.career === career);
    }

    // 3. Filtro por ciclo
    if (cycle !== 'ALL') {
      list = list.filter((st) => st.currentCycle === Number(cycle));
    }

    // 4. Filtro por estado
    if (status === 'PENDING') {
      list = list.filter((st) => !st.isVerified && st.status !== 'APPROVED');
    } else if (status === 'APPROVED') {
      list = list.filter((st) => st.isVerified || st.status === 'APPROVED');
    }

    // 5. Ordenamiento
    list.sort((a, b) => {
      switch (sort) {
        case 'alpha_asc':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'alpha_desc':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        case 'cycle_desc':
          return (b.currentCycle || 0) - (a.currentCycle || 0);
        case 'cycle_asc':
          return (a.currentCycle || 0) - (b.currentCycle || 0);
        default:
          return 0;
      }
    });

    return list;
  });

  // Lista filtrada de Habilidades
  filteredSkillValidations = computed(() => {
    let list = [...this.skillValidations()];
    const search = this.skillSearchTerm().trim().toLowerCase();

    if (search) {
      list = list.filter((sk) => {
        const student = (sk.studentName || '').toLowerCase();
        const skill = (sk.skillName || '').toLowerCase();
        return student.includes(search) || skill.includes(search);
      });
    }

    return list;
  });

  // Lista filtrada de Convenios
  filteredAgreements = computed(() => {
    let list = [...this.agreements()];
    const search = this.agreementSearchTerm().trim().toLowerCase();

    if (search) {
      list = list.filter((a) => {
        const company = (a.companyName || '').toLowerCase();
        const student = (a.studentName || '').toLowerCase();
        const title = (a.title || '').toLowerCase();
        return company.includes(search) || student.includes(search) || title.includes(search);
      });
    }

    return list;
  });

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadInstitutionData();
    this.loadStudentsData();
    this.loadSkillsData();
    this.loadAgreementsData();
    this.loadAnalyticsData();
  }

  loadInstitutionData(): void {
    this.profileService.getMyInstitutionProfile().subscribe({
      next: (data) => {
        const isVerified = Boolean(
          data.isVerified ||
          (data.id && localStorage.getItem(`unext_inst_verified_${data.id}`) === 'true') ||
          (data.userId && localStorage.getItem(`unext_inst_verified_${data.userId}`) === 'true') ||
          localStorage.getItem('unext_inst_verified_current') === 'true'
        );
        this.institution.set({ ...data, isVerified });
      },
      error: () => {}
    });
  }

  // Carga estricta y enriquecida de alumnos consumiendo GET /api/institution/students/pending y GET /api/profiles/postulants/directory/{id}
  loadStudentsData(): void {
    this.isLoadingStudents.set(true);

    this.http.get<any[]>(`${environment.apiUrl}/institution/students/pending`).subscribe({
      next: (rawPending) => {
        if (!rawPending || rawPending.length === 0) {
          this.students.set([]);
          this.isLoadingStudents.set(false);
          this.isLoading.set(false);
          return;
        }

        // Consultamos el perfil público completo de cada alumno para obtener código, carrera y ciclo reales del endpoint
        const detailObservables = rawPending.map((s) =>
          this.profileService.getPostulantPublicProfile(s.postulantId).pipe(
            catchError(() => of(null))
          )
        );

        // También consultamos el directorio general de perfiles como respaldo de carreras
        const directoryObservable = this.http
          .get<any[]>(`${environment.apiUrl}/profiles/postulants/directory`)
          .pipe(catchError(() => of([])));

        forkJoin({
          profiles: forkJoin(detailObservables),
          directory: directoryObservable
        }).subscribe({
          next: ({ profiles, directory }) => {
            const dirMap = new Map((directory || []).map((d) => [d.id || d.userId, d]));

            const mapped: DetailedStudentItem[] = rawPending.map((s, index) => {
              const detail = profiles[index];
              const dirInfo = dirMap.get(s.postulantId);

              // Respaldo de caché local en caso se haya registrado en la misma sesión o navegador
              let cachedData: any = null;
              try {
                const rawCache =
                  localStorage.getItem(`unext_postulant_${s.postulantId}`) ||
                  localStorage.getItem(`unext_academic_req_${s.postulantId}`) ||
                  localStorage.getItem('unext_last_academic_req');
                if (rawCache) cachedData = JSON.parse(rawCache);
              } catch {}

              const studentCode =
                detail?.studentCode ||
                s.studentCode ||
                cachedData?.studentCode ||
                'No registrado';

              const career =
                detail?.career ||
                dirInfo?.career ||
                s.career ||
                cachedData?.career ||
                'No especificada';

              const currentCycle =
                detail?.currentCycle ??
                s.currentCycle ??
                cachedData?.currentCycle ??
                null;

              const email =
                detail?.institutionalEmail ||
                s.email ||
                cachedData?.institutionalEmail ||
                '—';

              const isVerified = Boolean(
                s.isVerified || detail?.isInstitutionVerified || dirInfo?.isInstitutionVerified
              );

              return {
                postulantId: s.postulantId,
                firstName: detail?.firstName || s.firstName || 'Estudiante',
                lastName: detail?.lastName || s.lastName || '',
                email,
                studentCode,
                career,
                currentCycle,
                isVerified,
                avatarUrl: detail?.avatarUrl || null,
                academicStatus: detail?.academicStatus || cachedData?.academicStatus || undefined,
                evidenceUrl: detail?.academicEvidenceUrl || cachedData?.academicEvidenceUrl || null,
                status: isVerified ? 'APPROVED' : 'PENDING'
              };
            });

            this.students.set(mapped);
            this.isLoadingStudents.set(false);
            this.isLoading.set(false);
          },
          error: () => {
            const mapped: DetailedStudentItem[] = rawPending.map((s) => ({
              postulantId: s.postulantId,
              firstName: s.firstName || 'Estudiante',
              lastName: s.lastName || '',
              email: s.email || '—',
              studentCode: s.studentCode || 'No registrado',
              career: s.career || 'No especificada',
              currentCycle: s.currentCycle || null,
              isVerified: Boolean(s.isVerified),
              avatarUrl: null,
              status: s.isVerified ? 'APPROVED' : 'PENDING'
            }));
            this.students.set(mapped);
            this.isLoadingStudents.set(false);
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.students.set([]);
        this.isLoadingStudents.set(false);
        this.isLoading.set(false);
      }
    });
  }

  // Carga estricta de validaciones de habilidades desde GET /api/institution/validations/pending
  loadSkillsData(): void {
    this.isLoadingSkills.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/institution/validations/pending`).subscribe({
      next: (list) => {
        if (!list || list.length === 0) {
          this.skillValidations.set([]);
        } else {
          const mapped: DetailedSkillValidation[] = list.map((sk) => ({
            validationId: sk.validationId,
            studentName: sk.studentName || 'Estudiante',
            skillName: sk.skillName || 'Competencia',
            evidenceUrl: sk.evidenceUrl || undefined,
            status: sk.status || 'PENDING'
          }));
          this.skillValidations.set(mapped);
        }
        this.isLoadingSkills.set(false);
      },
      error: () => {
        this.skillValidations.set([]);
        this.isLoadingSkills.set(false);
      }
    });
  }

  // Carga estricta de convenios desde GET /api/institution/agreements
  loadAgreementsData(): void {
    this.isLoadingAgreements.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/institution/agreements`).subscribe({
      next: (list) => {
        if (!list || list.length === 0) {
          this.agreements.set([]);
        } else {
          const mapped: CorporateAgreementItem[] = list.map((a) => ({
            id: a.id,
            title: a.title || 'Convenio de Prácticas',
            companyName: a.companyName || 'Empresa',
            studentName: a.studentName || 'Estudiante',
            weeklyHours: a.weeklyHours || 30,
            startDate: a.startDate,
            endDate: a.endDate,
            status: a.status || 'PENDING',
            documentUrl: a.documentUrl,
            observations: a.observations
          }));
          this.agreements.set(mapped);
        }
        this.isLoadingAgreements.set(false);
      },
      error: () => {
        this.agreements.set([]);
        this.isLoadingAgreements.set(false);
      }
    });
  }

  // Carga de Métricas y Estadísticas de Empleabilidad (DashboardController)
  loadAnalyticsData(): void {
    this.isLoadingAnalytics.set(true);
    const careerFilter = this.selectedAnalyticsCareer();
    const queryParam = careerFilter !== 'ALL' ? `?career=${encodeURIComponent(careerFilter)}` : '';

    // 1. Demanda laboral por carrera (gráfico de barras)
    const demand$ = this.http
      .get<{ careers: CareerDemandItem[]; message?: string }>(
        `${environment.apiUrl}/institution/dashboard/demand-by-career`
      )
      .pipe(catchError(() => of({ careers: [] })));

    // 2. Resumen y tasa de empleabilidad
    const summary$ = this.http
      .get<DashboardSummaryData>(`${environment.apiUrl}/institution/dashboard/summary${queryParam}`)
      .pipe(catchError(() => of(null)));

    // 3. Top empresas empleadoras
    const companies$ = this.http
      .get<{ companies: TopCompanyItem[]; message?: string }>(
        `${environment.apiUrl}/institution/dashboard/top-companies${queryParam ? queryParam + '&limit=5' : '?limit=5'}`
      )
      .pipe(catchError(() => of({ companies: [] })));

    forkJoin({
      demand: demand$,
      summary: summary$,
      companies: companies$
    }).subscribe({
      next: ({ demand, summary, companies }) => {
        let careerList = demand.careers || [];
        if (careerFilter !== 'ALL') {
          careerList = careerList.filter(
            (c) => c.career?.trim().toLowerCase() === careerFilter.trim().toLowerCase()
          );
        }
        this.careerDemands.set(careerList);
        this.analyticsSummary.set(summary);
        this.topCompanies.set(companies.companies || []);
        this.isLoadingAnalytics.set(false);
      },
      error: () => {
        this.isLoadingAnalytics.set(false);
      }
    });
  }

  onAnalyticsCareerChange(career: string): void {
    this.selectedAnalyticsCareer.set(career);
    this.loadAnalyticsData();
  }

  // =========================================================================
  // ACCIONES: ACREDITAR ALUMNO (PATCH /api/institution/students/{id}/verify)
  // =========================================================================
  verifyStudent(student: DetailedStudentItem, status: 'APPROVED' | 'REJECTED'): void {
    this.processingStudentId.set(student.postulantId);

    this.http
      .patch<string>(
        `${environment.apiUrl}/institution/students/${student.postulantId}/verify?status=${status}`,
        {},
        { responseType: 'text' as 'json' }
      )
      .subscribe({
        next: (msg) => {
          this.processingStudentId.set(null);
          this.updateLocalStudentStatus(student.postulantId, status);
          this.showToast(
            status === 'APPROVED' ? 'Alumno acreditado con éxito.' : 'Solicitud académica rechazada.',
            status === 'APPROVED' ? 'success' : 'info'
          );
        },
        error: (err) => {
          this.processingStudentId.set(null);
          this.showToast(readApiError(err, 'No se pudo actualizar el estado del alumno.'), 'error');
        }
      });
  }

  private updateLocalStudentStatus(id: string, status: 'APPROVED' | 'REJECTED'): void {
    this.students.update((list) =>
      list.map((s) => (s.postulantId === id ? { ...s, status, isVerified: status === 'APPROVED' } : s))
    );
  }

  // =========================================================================
  // ACCIONES: VALIDAR HABILIDAD (PATCH /api/institution/validations/{id}/status)
  // =========================================================================
  verifySkill(validation: DetailedSkillValidation, status: 'APPROVED' | 'REJECTED'): void {
    this.processingValidationId.set(validation.validationId);

    this.http
      .patch<string>(
        `${environment.apiUrl}/institution/validations/${validation.validationId}/status`,
        { status },
        { responseType: 'text' as 'json' }
      )
      .subscribe({
        next: () => {
          this.processingValidationId.set(null);
          this.skillValidations.update((list) => list.filter((sk) => sk.validationId !== validation.validationId));
          this.showToast(
            status === 'APPROVED' ? 'Habilidad validada oficialmente.' : 'Validación rechazada.',
            status === 'APPROVED' ? 'success' : 'info'
          );
        },
        error: (err) => {
          this.processingValidationId.set(null);
          this.showToast(readApiError(err, 'No se pudo actualizar la validación.'), 'error');
        }
      });
  }

  // =========================================================================
  // ACCIONES: GESTIONAR CONVENIO (PATCH /api/institution/agreements/{id}/status)
  // =========================================================================
  updateAgreementStatus(agreement: CorporateAgreementItem, newStatus: 'APPROVED' | 'REJECTED'): void {
    this.processingAgreementId.set(agreement.id);

    this.http
      .patch<any>(
        `${environment.apiUrl}/institution/agreements/${agreement.id}/status`,
        { status: newStatus },
        { responseType: 'json' }
      )
      .subscribe({
        next: () => {
          this.processingAgreementId.set(null);
          this.agreements.update((list) =>
            list.map((a) => (a.id === agreement.id ? { ...a, status: newStatus } : a))
          );
          this.showToast(
            newStatus === 'APPROVED' ? 'Convenio convalidado y aprobado.' : 'Convenio rechazado.',
            'success'
          );
        },
        error: (err) => {
          this.processingAgreementId.set(null);
          this.showToast(readApiError(err, 'No se pudo actualizar el estado del convenio.'), 'error');
        }
      });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCareer.set('ALL');
    this.selectedCycle.set('ALL');
    this.selectedStatus.set('ALL');
    this.sortBy.set('time_desc');
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4500);
  }
}
