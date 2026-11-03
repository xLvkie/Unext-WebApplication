import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../../shared/components/toast/toast';
import { JobService } from '../../../core/services/job.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ConnectionService } from '../../../core/services/connection.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  AgreementCreateRequest,
  AgreementResponse,
  AgreementStatus,
  ApplicationStatus,
  ExperienceLevel,
  JobModality,
  JobOffer,
  JobOfferRequest,
  RecruiterApplicantFilters,
  RecruiterApplicationItem
} from '../../../core/models/job.model';
import {
  PostulantProfileResponse,
  StudentSkillResponse
} from '../../../core/models/profile.model';
import { readApiError } from '../../../core/utils/api-error';
import { formatMoney, toDate } from '../../../core/utils/format';
import { readFileAsDataUrl } from '../../../core/utils/file-media';
import {
  applicationLabel,
  experienceLabel,
  modalityLabel
} from '../../../core/utils/labels';

export type RecruiterJobsTab = 'MY_JOBS' | 'AGREEMENTS' | 'MARKET_EXPLORER';

@Component({
  selector: 'app-recruiter-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, Toast],
  templateUrl: './recruiter-jobs.html'
})
export class RecruiterJobs implements OnInit {
  private jobService = inject(JobService);
  private profileService = inject(ProfileService);
  private connectionService = inject(ConnectionService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  readonly router = inject(Router);

  activeTab = signal<RecruiterJobsTab>('MY_JOBS');

  isLoadingJobs = signal(true);
  isLoadingApplicants = signal(false);
  isSavingJob = signal(false);
  isOpeningChat = signal(false);

  myJobs = signal<JobOffer[]>([]);
  selectedJob = signal<JobOffer | null>(null);
  applicants = signal<RecruiterApplicationItem[]>([]);

  // Convenios emitidos por la empresa
  myAgreements = signal<AgreementResponse[]>([]);
  isAgreementModalOpen = signal(false);
  isSavingAgreement = signal(false);
  agreementFormError = signal<string | null>(null);
  agreementFileName = signal<string>('');
  agreementFileSize = signal<string>('');

  agreementForm: AgreementCreateRequest = {
    postulantId: '',
    jobApplicationId: null,
    title: '',
    startDate: '',
    endDate: '',
    weeklyHours: 30,
    documentUrl: '',
    observations: ''
  };

  // Postulante expandido en vista detallada
  expandedApplicantId = signal<string | null>(null);
  expandedPostulantDetail = signal<PostulantProfileResponse | null>(null);
  isLoadingCandidateDetail = signal(false);

  interviewCompletedMap = signal<Record<string, boolean>>({});

  applicantFilters: RecruiterApplicantFilters = {
    career: '',
    minCycle: null,
    skill: '',
    minRating: null,
    minReviews: null
  };
  statusFilter = signal<'ALL' | ApplicationStatus>('ALL');

  // Explorador de Mercado
  marketJobs = signal<JobOffer[]>([]);
  selectedMarketJob = signal<JobOffer | null>(null);
  isLoadingMarket = signal(false);
  marketKeyword = '';
  marketModality: '' | JobModality = '';
  marketExperience: '' | ExperienceLevel = '';

  // Modal de Crear / Editar Vacante
  isJobModalOpen = signal(false);
  editingJobId = signal<string | null>(null);
  jobFormError = signal<string | null>(null);

  skillInput = '';
  skillSuggestions = signal<string[]>([]);

  jobForm: JobOfferRequest = {
    title: '',
    description: '',
    requirements: '',
    requiredSkills: [],
    location: 'Lima, Perú',
    modality: 'HYBRID',
    experienceLevel: 'TRAINEE',
    minSalary: 1200,
    maxSalary: 2000
  };

  toast = signal<ToastData | null>(null);

  activeJobsCount = computed(
    () => this.myJobs().filter((j) => j.isActive !== false).length
  );

  closedJobsCount = computed(
    () => this.myJobs().filter((j) => j.isActive === false).length
  );

  filteredApplicants = computed(() => {
    const filter = this.statusFilter();
    const list = this.applicants();
    if (filter === 'ALL') return list;
    return list.filter((a) => a.status === filter);
  });

  expandedCandidate = computed<RecruiterApplicationItem | null>(() => {
    const id = this.expandedApplicantId();
    if (!id) return null;
    return this.applicants().find((a) => a.id === id) || null;
  });

  // Busca si la postulación actualmente expandida ya tiene un Convenio de Prácticas emitido
  agreementForExpandedCandidate = computed<AgreementResponse | null>(() => {
    const cand = this.expandedCandidate();
    if (!cand) return null;
    return (
      this.myAgreements().find((ag) => ag.jobApplicationId === cand.id) || null
    );
  });

  // Evalúa si la vacante actual es TRAINEE y el candidato es universitario verificado
  canCreateAgreementForExpanded = computed<boolean>(() => {
    const job = this.selectedJob();
    const cand = this.expandedCandidate();
    const detail = this.expandedPostulantDetail();
    if (!job || !cand) return false;

    const isTraineeJob = job.experienceLevel === 'TRAINEE';
    const isVerifiedStudent = Boolean(
      cand.isInstitutionVerified || detail?.isInstitutionVerified
    );
    const validStage =
      cand.status === 'UNDER_REVIEW' || cand.status === 'ACCEPTED';

    return isTraineeJob && isVerifiedStudent && validStage;
  });

  expandedCandidateTopSkills = computed<StudentSkillResponse[]>(() => {
    const detail = this.expandedPostulantDetail();
    if (!detail || !detail.skills) return [];
    return detail.skills.filter((s) => Boolean(s.isTopSkill));
  });

  expandedCandidateAllSkills = computed<StudentSkillResponse[]>(() => {
    const detail = this.expandedPostulantDetail();
    if (detail && detail.skills && detail.skills.length > 0) {
      return detail.skills;
    }
    const cand = this.expandedCandidate();
    if (!cand || !cand.skills) return [];
    return cand.skills.map((name, idx) => ({
      id: `sk-${idx}`,
      name,
      masteryLevel: 'INTERMEDIO',
      isTopSkill: false,
      isValidatedByInstitution: false
    }));
  });

  countByStatus = computed(() => {
    const list = this.applicants();
    return {
      ALL: list.length,
      RECEIVED: list.filter((a) => a.status === 'RECEIVED').length,
      UNDER_REVIEW: list.filter((a) => a.status === 'UNDER_REVIEW').length,
      ACCEPTED: list.filter((a) => a.status === 'ACCEPTED').length,
      REJECTED: list.filter((a) => a.status === 'REJECTED').length
    };
  });

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      if (tabParam === 'agreements') {
        this.activeTab.set('AGREEMENTS');
      }
    });

    this.loadMyJobs();
    this.loadMyAgreements();
    this.loadMarketJobs();
  }

  // =========================================================================
  // 1. LISTAR Y SELECCIONAR MIS VACANTES + CONVENIOS
  // =========================================================================
  loadMyJobs(): void {
    this.isLoadingJobs.set(true);
    this.jobService.getMyRecruiterJobs().subscribe({
      next: (jobs) => {
        this.myJobs.set(jobs);
        this.isLoadingJobs.set(false);

        const currentSelected = this.selectedJob();
        if (currentSelected) {
          const updated = jobs.find((j) => j.id === currentSelected.id) || jobs[0] || null;
          this.selectJob(updated);
        } else if (jobs.length > 0) {
          this.selectJob(jobs[0]);
        }
      },
      error: (err) => {
        this.isLoadingJobs.set(false);
        this.showToast(readApiError(err, 'No se pudieron cargar tus vacantes.'), 'error');
      }
    });
  }

  loadMyAgreements(): void {
    this.jobService.getMyRecruiterAgreements().subscribe({
      next: (list) => this.myAgreements.set(list),
      error: () => this.myAgreements.set([])
    });
  }

  selectJob(job: JobOffer | null): void {
    this.selectedJob.set(job);
    this.statusFilter.set('ALL');
    this.closeExpandedCandidate();
    if (job) {
      this.loadApplicantsForSelectedJob();
    } else {
      this.applicants.set([]);
    }
  }

  // =========================================================================
  // EXPANDIR / CERRAR VISTA DETALLADA DE UNA POSTULACIÓN
  // =========================================================================
  expandCandidate(candidate: RecruiterApplicationItem): void {
    this.expandedApplicantId.set(candidate.id);
    this.expandedPostulantDetail.set(null);
    this.isLoadingCandidateDetail.set(true);

    this.profileService.getPostulantPublicProfile(candidate.postulantProfileId).subscribe({
      next: (detail) => {
        this.expandedPostulantDetail.set(detail);
        this.isLoadingCandidateDetail.set(false);
      },
      error: () => {
        this.isLoadingCandidateDetail.set(false);
      }
    });
  }

  closeExpandedCandidate(): void {
    this.expandedApplicantId.set(null);
    this.expandedPostulantDetail.set(null);
  }

  openChatWithCandidate(candidate: RecruiterApplicationItem): void {
    const targetUserId =
      candidate.postulantUserId || this.expandedPostulantDetail()?.userId;

    if (!targetUserId) {
      this.router.navigate(['/messages']);
      return;
    }

    this.isOpeningChat.set(true);
    this.connectionService.sendRequest(targetUserId).subscribe({
      next: () => {
        this.isOpeningChat.set(false);
        this.router.navigate(['/messages'], { queryParams: { con: targetUserId } });
      },
      error: () => {
        this.isOpeningChat.set(false);
        this.router.navigate(['/messages'], { queryParams: { con: targetUserId } });
      }
    });
  }

  // =========================================================================
  // CREACIÓN DE CONVENIO DE PRÁCTICAS DESDE LA POSTULACIÓN
  // =========================================================================
  openAgreementModal(candidate: RecruiterApplicationItem): void {
    const job = this.selectedJob();
    if (!job) return;

    if (job.experienceLevel !== 'TRAINEE') {
      this.showToast(
        'Solo se pueden generar convenios de prácticas para vacantes de nivel Practicante (TRAINEE).',
        'warning'
      );
      return;
    }

    if (!candidate.isInstitutionVerified && !this.expandedPostulantDetail()?.isInstitutionVerified) {
      this.showToast(
        'El postulante debe estar verificado académicamente por su universidad para emitir un convenio.',
        'warning'
      );
      return;
    }

    const today = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(today.getMonth() + 6);

    const formatIso = (d: Date) => d.toISOString().split('T')[0];

    this.agreementFormError.set(null);
    this.agreementFileName.set('');
    this.agreementFileSize.set('');
    this.agreementForm = {
      postulantId: candidate.postulantProfileId,
      jobApplicationId: candidate.id,
      title: `Convenio de Prácticas Preprofesionales - ${job.title} (${candidate.firstName} ${candidate.lastName})`,
      startDate: formatIso(today),
      endDate: formatIso(sixMonthsLater),
      weeklyHours: 30,
      documentUrl: '',
      observations: `Convenio generado para la vacante ${job.title}.`
    };

    this.isAgreementModalOpen.set(true);
  }

  async onAgreementDocumentSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 6 * 1024 * 1024) {
      this.agreementFormError.set('El documento del convenio no debe superar los 6 MB.');
      return;
    }

    try {
      const result = await readFileAsDataUrl(file);
      this.agreementForm.documentUrl = result.dataUrl;
      this.agreementFileName.set(result.fileName);
      this.agreementFileSize.set(result.fileSizeLabel);
      this.agreementFormError.set(null);
    } catch {
      this.agreementFormError.set('No se pudo procesar el archivo seleccionado.');
    }
  }

  submitCreateAgreement(): void {
    this.agreementFormError.set(null);

    if (!this.agreementForm.title.trim()) {
      this.agreementFormError.set('El título del convenio es obligatorio.');
      return;
    }
    if (!this.agreementForm.startDate || !this.agreementForm.endDate) {
      this.agreementFormError.set('Las fechas de inicio y fin son obligatorias.');
      return;
    }
    if (this.agreementForm.startDate >= this.agreementForm.endDate) {
      this.agreementFormError.set('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }
    if (!this.agreementForm.weeklyHours || this.agreementForm.weeklyHours < 1 || this.agreementForm.weeklyHours > 48) {
      this.agreementFormError.set('Ingresa una cantidad válida de horas semanales (entre 1 y 48 h).');
      return;
    }
    if (!this.agreementForm.documentUrl.trim()) {
      this.agreementFormError.set('Debes adjuntar el documento PDF/Word del convenio.');
      return;
    }

    this.isSavingAgreement.set(true);
    this.jobService.createRecruiterAgreement(this.agreementForm).subscribe({
      next: (created) => {
        this.isSavingAgreement.set(false);
        this.isAgreementModalOpen.set(false);
        this.myAgreements.update((list) => [created, ...list]);
        this.showToast(
          '📜 ¡Convenio de prácticas registrado y enviado a la universidad del alumno para su firma!',
          'success'
        );
      },
      error: (err) => {
        this.isSavingAgreement.set(false);
        this.agreementFormError.set(
          readApiError(err, 'No se pudo registrar el convenio de prácticas.')
        );
      }
    });
  }

  downloadAgreementDocument(agreement: AgreementResponse): void {
    if (!agreement.documentUrl) return;
    const link = document.createElement('a');
    link.href = agreement.documentUrl;
    link.download = `${agreement.title.replace(/\s+/g, '_')}.pdf`;
    link.click();
  }

  agreementStatusBadge(status: AgreementStatus): string {
    if (status === 'APPROVED') return '✓ Aprobado por Universidad';
    if (status === 'REJECTED') return '✕ Rechazado por Universidad';
    return '⏳ Pendiente de firma institucional';
  }

  // =========================================================================
  // 2. CREAR Y EDITAR VACANTES
  // =========================================================================
  openCreateJobModal(): void {
    this.editingJobId.set(null);
    this.jobFormError.set(null);
    this.skillInput = '';
    this.jobForm = {
      title: '',
      description: '',
      requirements: '',
      requiredSkills: ['Trabajo en equipo'],
      location: 'Lima, Perú',
      modality: 'HYBRID',
      experienceLevel: 'TRAINEE',
      minSalary: 1200,
      maxSalary: 1800
    };
    this.isJobModalOpen.set(true);
  }

  openEditJobModal(job: JobOffer, event?: Event): void {
    event?.stopPropagation();
    this.editingJobId.set(job.id);
    this.jobFormError.set(null);
    this.skillInput = '';
    this.jobForm = {
      title: job.title || '',
      description: job.description || '',
      requirements: job.requirements || '',
      requiredSkills: [...(job.requiredSkills || [])],
      location: job.location || 'Lima, Perú',
      modality: (job.modality as JobModality) || 'HYBRID',
      experienceLevel: (job.experienceLevel as ExperienceLevel) || 'TRAINEE',
      minSalary: job.minSalary ?? null,
      maxSalary: job.maxSalary ?? null
    };
    this.isJobModalOpen.set(true);
  }

  onSkillInputKey(query: string): void {
    const clean = query.trim();
    if (clean.length < 1) {
      this.skillSuggestions.set([]);
      return;
    }
    this.jobService.suggestSkills(clean).subscribe({
      next: (list: string[]) =>
        this.skillSuggestions.set(
          list.filter((s: string) => !this.jobForm.requiredSkills.includes(s)).slice(0, 6)
        ),
      error: () => this.skillSuggestions.set([])
    });
  }

  addRequiredSkill(skillName?: string): void {
    const value = (skillName ?? this.skillInput).trim();
    if (!value) return;
    const exists = this.jobForm.requiredSkills.some(
      (s) => s.toLowerCase() === value.toLowerCase()
    );
    if (!exists) {
      this.jobForm.requiredSkills = [...this.jobForm.requiredSkills, value];
    }
    this.skillInput = '';
    this.skillSuggestions.set([]);
  }

  removeRequiredSkill(skill: string): void {
    this.jobForm.requiredSkills = this.jobForm.requiredSkills.filter((s) => s !== skill);
  }

  saveJobOffer(): void {
    this.jobFormError.set(null);

    if (
      !this.jobForm.title.trim() ||
      !this.jobForm.description.trim() ||
      !this.jobForm.requirements.trim()
    ) {
      this.jobFormError.set('El título, la descripción y los requisitos son obligatorios.');
      return;
    }

    if (this.jobForm.requiredSkills.length === 0) {
      this.jobFormError.set('Agrega al menos una habilidad requerida.');
      return;
    }

    if (
      this.jobForm.minSalary != null &&
      this.jobForm.maxSalary != null &&
      Number(this.jobForm.minSalary) > Number(this.jobForm.maxSalary)
    ) {
      this.jobFormError.set('El salario mínimo no puede ser mayor que el salario máximo.');
      return;
    }

    this.isSavingJob.set(true);
    const idToUpdate = this.editingJobId();

    const payload: JobOfferRequest = {
      title: this.jobForm.title.trim(),
      description: this.jobForm.description.trim(),
      requirements: this.jobForm.requirements.trim(),
      requiredSkills: this.jobForm.requiredSkills,
      location: this.jobForm.location?.trim() || 'Lima, Perú',
      modality: this.jobForm.modality,
      experienceLevel: this.jobForm.experienceLevel,
      minSalary: this.jobForm.minSalary,
      maxSalary: this.jobForm.maxSalary
    };

    const request$ = idToUpdate
      ? this.jobService.updateRecruiterJob(idToUpdate, payload)
      : this.jobService.createRecruiterJob(payload);

    request$.subscribe({
      next: (savedJob) => {
        this.isSavingJob.set(false);
        this.isJobModalOpen.set(false);
        this.loadMyJobs();
        this.selectJob(savedJob);
        this.showToast(
          idToUpdate
            ? 'Vacante actualizada. Se ha notificado automáticamente a los postulantes en proceso.'
            : '¡Nueva vacante publicada exitosamente!',
          'success'
        );
      },
      error: (err) => {
        this.isSavingJob.set(false);
        this.jobFormError.set(
          readApiError(
            err,
            'No se pudo guardar la vacante. Verifica que tu cuenta corporativa esté verificada.'
          )
        );
      }
    });
  }

  handleCloseJobOffer(job: JobOffer, event?: Event): void {
    event?.stopPropagation();
    if (job.isActive === false) return;
    if (!confirm(`¿Deseas cerrar la convocatoria "${job.title}"? Ya no recibirá nuevos postulantes.`)) {
      return;
    }

    this.jobService.closeRecruiterJob(job.id).subscribe({
      next: (closed) => {
        this.myJobs.update((list) => list.map((j) => (j.id === closed.id ? closed : j)));
        if (this.selectedJob()?.id === closed.id) {
          this.selectedJob.set(closed);
        }
        this.showToast('La vacante ha sido cerrada exitosamente.', 'info');
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo cerrar la vacante.'), 'error');
      }
    });
  }

  // =========================================================================
  // 3. ADMINISTRAR POSTULANTES Y EMBUDO DE SELECCIÓN
  // =========================================================================
  loadApplicantsForSelectedJob(): void {
    const job = this.selectedJob();
    if (!job) return;

    this.isLoadingApplicants.set(true);
    this.jobService.getJobApplicationsForRecruiter(job.id, this.applicantFilters).subscribe({
      next: (list) => {
        this.applicants.set(list);
        this.isLoadingApplicants.set(false);
      },
      error: (err) => {
        this.applicants.set([]);
        this.isLoadingApplicants.set(false);
        this.showToast(readApiError(err, 'No se encontraron candidatos con esos filtros.'), 'warning');
      }
    });
  }

  clearApplicantFilters(): void {
    this.applicantFilters = {
      career: '',
      minCycle: null,
      skill: '',
      minRating: null,
      minReviews: null
    };
    this.loadApplicantsForSelectedJob();
  }

  changeCandidateStatus(candidate: RecruiterApplicationItem, newStatus: ApplicationStatus): void {
    this.jobService.updateApplicationStatus(candidate.id, newStatus).subscribe({
      next: () => {
        this.applicants.update((list) =>
          list.map((item) => (item.id === candidate.id ? { ...item, status: newStatus } : item))
        );

        const targetUserId =
          candidate.postulantUserId || this.expandedPostulantDetail()?.userId;

        if (newStatus === 'UNDER_REVIEW') {
          if (targetUserId) {
            this.connectionService.sendRequest(targetUserId).subscribe({ error: () => {} });
          }
          this.showToast(
            `¡${candidate.firstName} pasó a Evaluación! El chat directo ha sido habilitado.`,
            'info'
          );
        } else if (newStatus === 'ACCEPTED') {
          this.showToast(
            `🎉 ¡${candidate.firstName} ${candidate.lastName} ha sido CONTRATADO en la vacante!`,
            'success'
          );
        } else if (newStatus === 'REJECTED') {
          this.showToast(
            `Postulación de ${candidate.firstName} marcada como descartada.`,
            'warning'
          );
        }
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo actualizar el estado del postulante.'), 'error');
      }
    });
  }

  toggleInterviewStep(applicationId: string): void {
    this.interviewCompletedMap.update((prev) => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  }

  isInterviewCompleted(applicationId: string): boolean {
    return !!this.interviewCompletedMap()[applicationId];
  }

  downloadCandidateCv(candidate: RecruiterApplicationItem): void {
    const cvUrl = candidate.cvUrl || this.expandedPostulantDetail()?.cvUrl;
    const cvName =
      candidate.cvFileName ||
      this.expandedPostulantDetail()?.cvFileName ||
      `CV_${candidate.firstName}_${candidate.lastName}.pdf`;

    if (!cvUrl) {
      this.showToast('Este candidato aún no ha adjuntado un archivo de CV en su perfil.', 'warning');
      return;
    }
    const link = document.createElement('a');
    link.href = cvUrl;
    link.download = cvName;
    link.click();
  }

  hasCandidateCv(candidate: RecruiterApplicationItem): boolean {
    return Boolean(candidate.cvUrl || this.expandedPostulantDetail()?.cvUrl);
  }

  institutionInitials(name?: string | null): string {
    if (!name) return 'UNI';
    return (
      name
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3)
        .map((w) => w[0].toUpperCase())
        .join('') || 'UNI'
    );
  }

  // =========================================================================
  // 4. EXPLORAR VACANTES DE OTRAS EMPRESAS
  // =========================================================================
  switchToTab(tab: RecruiterJobsTab): void {
    this.activeTab.set(tab);
    if (tab === 'MARKET_EXPLORER' && this.marketJobs().length === 0) {
      this.loadMarketJobs();
    }
    if (tab === 'AGREEMENTS') {
      this.loadMyAgreements();
    }
  }

  loadMarketJobs(): void {
    this.isLoadingMarket.set(true);
    this.jobService
      .search(this.marketKeyword, this.marketModality, this.marketExperience)
      .subscribe({
        next: (offers) => {
          this.marketJobs.set(offers);
          this.selectedMarketJob.set(offers[0] || null);
          this.isLoadingMarket.set(false);
        },
        error: () => {
          this.marketJobs.set([]);
          this.isLoadingMarket.set(false);
        }
      });
  }

  resetMarketFilters(): void {
    this.marketKeyword = '';
    this.marketModality = '';
    this.marketExperience = '';
    this.loadMarketJobs();
  }

  modalityText(m?: JobModality | string | null): string {
    return modalityLabel(m);
  }

  experienceText(e?: ExperienceLevel | string | null): string {
    return experienceLabel(e);
  }

  statusText(s?: ApplicationStatus | string | null): string {
    return applicationLabel(s);
  }

  salaryText(min?: number | null, max?: number | null): string {
    if (!min && !max) return 'Salario a tratar';
    if (min && max) return `${formatMoney(min)} – ${formatMoney(max)}`;
    return formatMoney(min ?? max) || 'Salario a tratar';
  }

  formatRelativeDate(value: unknown): string {
    const d = toDate(value);
    if (!d) return 'Reciente';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4200);
  }
}