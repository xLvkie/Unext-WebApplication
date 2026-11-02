import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../../shared/components/toast/toast';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ApplicationStatus,
  ExperienceLevel,
  JobModality,
  JobOffer,
  JobOfferRequest,
  RecruiterApplicantFilters,
  RecruiterApplicationItem
} from '../../../core/models/job.model';
import { readApiError } from '../../../core/utils/api-error';
import { formatMoney, toDate } from '../../../core/utils/format';
import {
  applicationLabel,
  experienceLabel,
  modalityLabel
} from '../../../core/utils/labels';

export type RecruiterJobsTab = 'MY_JOBS' | 'MARKET_EXPLORER';

@Component({
  selector: 'app-recruiter-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, Toast],
  templateUrl: './recruiter-jobs.html'
})
export class RecruiterJobs implements OnInit {
  private jobService = inject(JobService);
  private authService = inject(AuthService);
  readonly router = inject(Router);

  activeTab = signal<RecruiterJobsTab>('MY_JOBS');

  isLoadingJobs = signal(true);
  isLoadingApplicants = signal(false);
  isSavingJob = signal(false);

  myJobs = signal<JobOffer[]>([]);
  selectedJob = signal<JobOffer | null>(null);
  applicants = signal<RecruiterApplicationItem[]>([]);

  interviewCompletedMap = signal<Record<string, boolean>>({});

  applicantFilters: RecruiterApplicantFilters = {
    career: '',
    minCycle: null,
    skill: '',
    minRating: null,
    minReviews: null
  };
  statusFilter = signal<'ALL' | ApplicationStatus>('ALL');


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

  // Computados útiles
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
    this.loadMyJobs();
    this.loadMarketJobs();
  }

  // =========================================================================
  // LISTAR Y SELECCIONAR MIS VACANTES
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

  selectJob(job: JobOffer | null): void {
    this.selectedJob.set(job);
    this.statusFilter.set('ALL');
    if (job) {
      this.loadApplicantsForSelectedJob();
    } else {
      this.applicants.set([]);
    }
  }

  // =========================================================================
  // CREAR Y EDITAR VACANTES (MODAL UNIFICADO)
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
      this.jobFormError.set('Agrega al menos una habilidad requerida para el cálculo de compatibilidad IA.');
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
            : '¡Nueva vacante publicada! El motor de IA notificó a los candidatos compatibles.',
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
  // ADMINISTRAR POSTULANTES Y EMBUDO DE SELECCIÓN (PIPELINE GUIADO)
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

        if (newStatus === 'UNDER_REVIEW') {
          this.showToast(
            `¡${candidate.firstName} pasó a Evaluación! Se le notificó que el chat está habilitado.`,
            'info'
          );
        } else if (newStatus === 'ACCEPTED') {
          this.showToast(
            `🎉 ¡${candidate.firstName} ${candidate.lastName} ha sido ACEPTADO / CONTRATADO en la vacante!`,
            'success'
          );
        } else if (newStatus === 'REJECTED') {
          this.showToast(
            `Postulación de ${candidate.firstName} finalizada (No seleccionado).`,
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
    if (!candidate.cvUrl) {
      this.showToast('Este candidato aún no ha adjuntado un archivo de CV en su perfil.', 'warning');
      return;
    }
    const link = document.createElement('a');
    link.href = candidate.cvUrl;
    link.download = candidate.cvFileName || `CV_${candidate.firstName}_${candidate.lastName}.pdf`;
    link.click();
  }

  // =========================================================================
  // EXPLORAR VACANTES DE OTRAS EMPRESAS (MODO REFERENCIA / BENCHMARK)
  // =========================================================================
  switchToTab(tab: RecruiterJobsTab): void {
    this.activeTab.set(tab);
    if (tab === 'MARKET_EXPLORER' && this.marketJobs().length === 0) {
      this.loadMarketJobs();
    }
  }

  loadMarketJobs(): void {
    this.isLoadingMarket.set(true);
    this.jobService
      .search(
        this.marketKeyword,
        this.marketModality,
        this.marketExperience
      )
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