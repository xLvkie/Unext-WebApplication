import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { readApiError } from '../../core/utils/api-error';
import { AuthService } from '../../core/services/auth.service';
import { formatPosted, formatSalaryRange, initials } from '../../core/utils/format';
import {
  applicationLabel,
  compatibilityLabel,
  experienceLabel,
  modalityLabel,
} from '../../core/utils/labels';
import { JobApplication, JobOffer } from '../../core/models/job.model';
import { JobService } from '../../core/services/job.service';
import { Navbar } from '../../shared/components/navbar/navbar';
import { PostulantProfileResponse } from '../../core/models/profile.model';

@Component({ 
  selector: 'app-job-search',
  standalone: true,
  imports: [Navbar],
  templateUrl: './job-search.html',
})

export class JobSearch {
  private readonly jobsApi = inject(JobService);
  readonly auth = inject(AuthService);

  readonly pageSize = 10;
  readonly modalities = [
    { value: '', label: 'Todas' },
    { value: 'REMOTE', label: 'Remoto' },
    { value: 'HYBRID', label: 'Híbrido' },
    { value: 'ONSITE', label: 'Presencial' },
  ];
  readonly experiences = [
    { value: '', label: 'Todas' },
    { value: 'TRAINEE', label: 'Practicante' },
    { value: 'JUNIOR', label: 'Junior' },
    { value: 'SEMI_SENIOR', label: 'Semi senior' },
    { value: 'SENIOR', label: 'Senior' },
  ];

  readonly keyword = signal('');
  readonly modality = signal('');
  readonly experience = signal('');
  readonly location = signal('');
  readonly skill = signal('');
  readonly mode = signal<'search' | 'recommended'>('search');
  readonly loading = signal(false);
  readonly applying = signal(false);
  readonly error = signal('');
  readonly applyMessage = signal('');
  readonly jobs = signal<JobOffer[]>([]);
  readonly applications = signal<JobApplication[]>([]);
  readonly visibleCount = signal(this.pageSize);
  readonly selectedId = signal<string | null>(null);
  readonly isWide = signal(typeof window !== 'undefined' ? window.matchMedia('(min-width: 1280px)').matches : true);

  readonly filtered = computed(() => {
    const place = this.location().trim().toLowerCase();
    const skill = this.skill().trim().toLowerCase();
    return this.jobs().filter((job) => {
      const placeOk = !place || (job.location ?? '').toLowerCase().includes(place);
      const skillOk = !skill || (job.requiredSkills ?? []).some((item) => item.toLowerCase().includes(skill));
      return placeOk && skillOk;
    });
  });

  readonly visibleJobs = computed(() => this.filtered().slice(0, this.visibleCount()));
  readonly selected = computed(() => this.filtered().find((job) => job.id === this.selectedId()) ?? null);
  readonly canLoadMore = computed(() => this.visibleCount() < this.filtered().length);

  constructor() {
    const query = window.matchMedia('(min-width: 1280px)');
    query.addEventListener('change', (event) => this.isWide.set(event.matches));

    effect(() => {
      const session = this.auth.session();
      if (!session) {
        this.jobs.set([]);
        this.applications.set([]);
        this.selectedId.set(null);
        return;
      }
      untracked(() => this.search());
    });
  }

  search(): void {
    if (!this.auth.session()) {
      return;
    }
    this.mode.set('search');
    this.loading.set(true);
    this.error.set('');
    this.jobsApi.search(this.keyword(), this.modality(), this.experience()).subscribe({
      next: (jobs) => this.showJobs(jobs),
      error: (error: unknown) => {
        this.loading.set(false);
        this.jobs.set([]);
        this.error.set(readApiError(error, 'No se pudieron cargar los empleos.'));
      },
    });
  }

  loadRecommended(): void {
    if (this.auth.session()?.role !== 'POSTULANT') {
      return;
    }
    this.mode.set('recommended');
    this.loading.set(true);
    this.error.set('');
    this.jobsApi.recommendations().subscribe({
      next: (jobs) => this.showJobs(jobs),
      error: (error: unknown) => {
        this.loading.set(false);
        this.jobs.set([]);
        this.error.set(readApiError(error, 'No se pudieron cargar las recomendaciones.'));
      },
    });
  }

  clearFilters(): void {
    this.keyword.set('');
    this.modality.set('');
    this.experience.set('');
    this.location.set('');
    this.skill.set('');
    this.search();
  }

  loadMore(): void {
    this.visibleCount.update((count) => count + this.pageSize);
  }

  select(job: JobOffer): void {
    this.selectedId.set(job.id);
    this.applyMessage.set('');
  }

  closeDetail(): void {
    this.selectedId.set(null);
  }

  apply(job: JobOffer): void {
    this.applying.set(true);
    this.applyMessage.set('');
    this.jobsApi.apply(job.id).subscribe({
      next: (application) => {
        this.applying.set(false);
        this.applications.update((list) => [application, ...list]);
        this.applyMessage.set('Postulación enviada.');
      },
      error: (error: unknown) => {
        this.applying.set(false);
        this.applyMessage.set(readApiError(error, 'No se pudo enviar la postulación.'));
      },
    });
  }

  dismiss(job: JobOffer, event: Event): void {
    event.stopPropagation();
    this.jobsApi.dismiss(job.id).subscribe({
      next: () => {
        this.jobs.update((list) => list.filter((item) => item.id !== job.id));
        if (this.selectedId() === job.id) {
          this.selectedId.set(this.filtered()[0]?.id ?? null);
        }
      },
      error: (error: unknown) => this.error.set(readApiError(error, 'No se pudo descartar la vacante.')),
    });
  }

  applicationFor(job: JobOffer): JobApplication | undefined {
    return this.applications().find((item) => item.jobTitle === job.title && item.companyName === job.companyName);
  }

  appliedText(job: JobOffer): string | null {
    const application = this.applicationFor(job);
    return application ? this.status(application) : null;
  }

  salary(job: JobOffer): string {
    return formatSalaryRange(job.minSalary, job.maxSalary);
  }

  posted(job: JobOffer): string {
    return formatPosted(job.createdAt);
  }

  modalityText(job: JobOffer): string {
    return modalityLabel(job.modality);
  }

  experienceText(job: JobOffer): string {
    return experienceLabel(job.experienceLevel);
  }

  status(application: JobApplication): string {
    return applicationLabel(application.status);
  }

  affinity(job: JobOffer): string {
    const percent = job.compatibilityPercent;
    const label = compatibilityLabel(job.compatibilityLabel);
    if (percent == null) {
      return label;
    }
    return label ? `${percent}% · ${label}` : `${percent}%`;
  }

  logo(job: JobOffer): string {
    return initials(job.companyName || job.title);
  }

  preview(job: JobOffer): string {
    const text = (job.description ?? '').replace(/\s+/g, ' ').trim();
    if (text.length <= 140) {
      return text;
    }
    return `${text.slice(0, 140).trim()}…`;
  }

  skills(job: JobOffer, limit?: number): string[] {
    const list = job.requiredSkills ?? [];
    return limit == null ? list : list.slice(0, limit);
  }

  matched(job: JobOffer, skill: string): boolean {
    return (job.matchedSkills ?? []).some((item) => item.toLowerCase() === skill.toLowerCase());
  }

  onKeyword(event: Event): void {
    this.keyword.set((event.target as HTMLInputElement).value);
  }

  onLocation(event: Event): void {
    this.location.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(this.pageSize);
  }

  onSkill(event: Event): void {
    this.skill.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(this.pageSize);
  }

  onModality(event: Event): void {
    this.modality.set((event.target as HTMLSelectElement).value);
  }

  onExperience(event: Event): void {
    this.experience.set((event.target as HTMLSelectElement).value);
  }

  private showJobs(jobs: JobOffer[]): void {
    this.jobs.set(jobs);
    this.visibleCount.set(this.pageSize);
    this.selectedId.set(jobs[0]?.id ?? null);
    this.loading.set(false);
    this.loadApplications();
  }

  private loadApplications(): void {
    if (this.auth.session()?.role !== 'POSTULANT') {
      this.applications.set([]);
      return;
    }
    this.jobsApi.myApplications().subscribe({
      next: (applications) => this.applications.set(applications),
      error: () => this.applications.set([]),
    });
  }
}
