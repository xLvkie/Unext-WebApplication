import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../../shared/components/toast/toast';
import { ProfileSidebar } from '../../../shared/components/profile-sidebar/profile-sidebar';
import { ProfileService } from '../../../core/services/profile.service';
import { FeedService } from '../../../core/services/feed.service';
import { AuthService } from '../../../core/services/auth.service';
import { DirectoryService } from '../../../core/services/directory.service';
import {
  RecruiterProfileRequest,
  RecruiterProfileResponse,
  RecruiterProfileUpdate
} from '../../../core/models/profile.model';
import { FeedPostResponse } from '../../../core/models/feed.model';
import { JobOffer } from '../../../core/models/job.model';
import { readApiError } from '../../../core/utils/api-error';
import { resizeImageFile } from '../../../core/utils/file-media';

@Component({
  selector: 'app-recruiter-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, Toast, ProfileSidebar],
  templateUrl: './recruiter-profile.html'
})
export class RecruiterProfile implements OnInit {
  private profileService = inject(ProfileService);
  private feedService = inject(FeedService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  readonly directoryService = inject(DirectoryService);
  private router = inject(Router);

  readonly MAX_HEADLINE = 120;
  readonly MAX_BANNER_TEXT = 35;
  readonly MAX_DESCRIPTION = 1500;
  readonly MAX_IMPORTANT_POSTS = 5;

  isLoading = signal(true);
  isSaving = signal(false);
  isVerifyingOtp = signal(false);
  isFirstTimeOnboarding = signal(false);

  // Modales
  isEditModalOpen = signal(false);
  isBannerModalOpen = signal(false);
  isOtpModalOpen = signal(false);

  otpCode = '';
  errorMessage = signal<string | null>(null);
  otpErrorMessage = signal<string | null>(null);
  toast = signal<ToastData | null>(null);

  importantPosts = signal<FeedPostResponse[]>([]);
  companyJobs = signal<JobOffer[]>([]);

  profile = signal<RecruiterProfileResponse>({
    id: '',
    userId: '',
    companyName: '',
    ruc: '',
    industry: '',
    headline: '',
    websiteUrl: '',
    description: '',
    companyLogoUrl: null,
    bannerUrl: null,
    bannerText: null,
    isValidated: false,
    isVerified: false,
    validationsCount: 0,
    pendingVerificationCode: null
  });

  form: RecruiterProfileRequest = {
    companyName: '',
    ruc: '',
    industry: '',
    headline: '',
    websiteUrl: '',
    description: '',
    bannerText: '',
    companyLogoUrl: '',
    bannerUrl: ''
  };

  companyInitials = computed(() => {
    const name = this.profile().companyName?.trim() || 'Empresa';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || 'EM'
    );
  });

  safeBannerTitle = computed(() => {
    const custom = this.profile().bannerText?.trim();
    const fallback = this.profile().companyName?.trim() || 'Perfil Corporativo';
    const text = custom || fallback;
    return text.length > this.MAX_BANNER_TEXT ? text.slice(0, this.MAX_BANNER_TEXT) + '…' : text;
  });

  safeBannerSubtitle = computed(() => {
    const h =
      this.profile().headline?.trim() ||
      (this.profile().industry ? `${this.profile().industry} · RUC ${this.profile().ruc}` : 'Organización aliada en Unext');
    return h.length > 65 ? h.slice(0, 65) + '…' : h;
  });

  activeJobsCount = computed(() => this.companyJobs().filter((j) => j.isActive !== false).length);

  suggestedPeers = computed(() =>
    this.directoryService
      .contacts()
      .filter((c) => c.userId !== this.profile().userId)
      .slice(0, 3)
  );

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.directoryService.load().subscribe();
    this.loadMyRecruiterProfile();
  }

  loadMyRecruiterProfile(): void {
    this.isLoading.set(true);
    this.profileService.getMyRecruiterProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.syncFormWithProfile(data);
        this.isLoading.set(false);

        if (!data.companyName || !data.ruc) {
          this.isFirstTimeOnboarding.set(true);
          this.isEditModalOpen.set(true);
        } else {
          this.isFirstTimeOnboarding.set(false);
          this.authService.markProfileAsCompleted();

          // Si ya creó el perfil pero aún no verifica el OTP corporativo, abrimos el modal OTP
          if (!data.isVerified) {
            this.otpCode = data.pendingVerificationCode || '';
            this.isOtpModalOpen.set(true);
          }
        }

        if (data.userId) {
          this.loadImportantPosts(data.userId);
        }
        this.loadMyJobOffers();
      },
      error: () => {
        // 404: Primer ingreso tras registrarse como RECRUITER
        this.isLoading.set(false);
        this.isFirstTimeOnboarding.set(true);
        this.isEditModalOpen.set(true);
      }
    });
  }

  private loadImportantPosts(userId: string): void {
    this.feedService.getImportantPostsByUser(userId).subscribe({
      next: (posts) => this.importantPosts.set(posts),
      error: () => this.importantPosts.set([])
    });
  }

  private loadMyJobOffers(): void {
    this.http.get<JobOffer[]>(`${environment.apiUrl}/recruiter/jobs`).subscribe({
      next: (jobs) => this.companyJobs.set(jobs),
      error: () => this.companyJobs.set([])
    });
  }

  private syncFormWithProfile(p: RecruiterProfileResponse): void {
    this.form = {
      companyName: p.companyName || '',
      ruc: p.ruc || '',
      industry: p.industry || '',
      headline: (p.headline || '').slice(0, this.MAX_HEADLINE),
      websiteUrl: p.websiteUrl || '',
      description: (p.description || '').slice(0, this.MAX_DESCRIPTION),
      bannerText: (p.bannerText || '').slice(0, this.MAX_BANNER_TEXT),
      companyLogoUrl: p.companyLogoUrl || '',
      bannerUrl: p.bannerUrl || ''
    };
  }

  // Subida y auto-redimensionado de Logo (400x400) y Banner (1584x396)
  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    resizeImageFile(file, 400, 400).then((dataUrl) => {
      this.form.companyLogoUrl = dataUrl;
      if (!this.isFirstTimeOnboarding()) {
        this.quickSavePatch({ companyLogoUrl: dataUrl }, 'Logo corporativo actualizado.');
      }
    });
  }

  onBannerSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    resizeImageFile(file, 1584, 396).then((dataUrl) => {
      this.form.bannerUrl = dataUrl;
      if (!this.isFirstTimeOnboarding()) {
        this.quickSavePatch(
          { bannerUrl: dataUrl },
          'Portada corporativa redimensionada (1584×396 px) y guardada.'
        );
        this.isBannerModalOpen.set(false);
      }
    });
  }

  removeCustomBanner(): void {
    this.form.bannerUrl = '';
    if (!this.isFirstTimeOnboarding()) {
      this.quickSavePatch({ bannerUrl: '' }, 'Se restauró el banner corporativo autogenerado.');
      this.isBannerModalOpen.set(false);
    }
  }

  saveBannerSettings(): void {
    const cleanText = (this.form.bannerText || '').trim().slice(0, this.MAX_BANNER_TEXT);
    this.quickSavePatch(
      { bannerText: cleanText, bannerUrl: this.form.bannerUrl },
      'Configuración de portada actualizada.'
    );
    this.isBannerModalOpen.set(false);
  }

  private quickSavePatch(patch: Partial<RecruiterProfileRequest>, successMsg: string): void {
    this.profileService.updateRecruiterProfile(patch).subscribe({
      next: (saved) => {
        this.profile.set(saved);
        this.syncFormWithProfile(saved);
        this.showToast(successMsg, 'success');
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudieron guardar los cambios.'), 'error');
      }
    });
  }

  openEditModal(): void {
    this.syncFormWithProfile(this.profile());
    this.errorMessage.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    if (this.isFirstTimeOnboarding()) return;
    this.isEditModalOpen.set(false);
  }

  saveProfile(): void {
    const name = this.form.companyName.trim();
    const ruc = this.form.ruc.trim();
    const wasFirstTime = this.isFirstTimeOnboarding();

    if (!name || (wasFirstTime && !ruc)) {
      this.errorMessage.set('La razón social / nombre de la empresa y el RUC son obligatorios (*).');
      return;
    }

    if (wasFirstTime && !/^(10|20)\d{9}$/.test(ruc)) {
      this.errorMessage.set('El RUC debe tener 11 dígitos numéricos y comenzar con 10 o 20.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    // Payload base con todos los campos editables (SIN el RUC)
    const updatePayload: RecruiterProfileUpdate = {
      companyName: name,
      industry: this.form.industry?.trim() || 'Tecnología y Servicios Corporativos',
      headline:
        this.form.headline?.trim().slice(0, this.MAX_HEADLINE) ||
        `${name} · Reclutamiento y Selección en Unext`,
      websiteUrl: this.form.websiteUrl?.trim() || undefined,
      description: this.form.description?.trim().slice(0, this.MAX_DESCRIPTION) || undefined,
      bannerText: this.form.bannerText?.trim().slice(0, this.MAX_BANNER_TEXT) || undefined,
      companyLogoUrl: this.form.companyLogoUrl || undefined,
      bannerUrl: this.form.bannerUrl || undefined
    };

    // Solo enviamos "ruc" cuando es el registro inicial (POST); al editar (PUT) mandamos solo updatePayload
    const request$ = wasFirstTime
      ? this.profileService.createRecruiterProfile({ ...updatePayload, companyName: name, ruc })
      : this.profileService.updateRecruiterProfile(updatePayload);

    request$.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.profile.set(saved);
        this.authService.markProfileAsCompleted();
        this.isFirstTimeOnboarding.set(false);
        this.isEditModalOpen.set(false);

        if (!saved.isVerified) {
          this.otpCode = saved.pendingVerificationCode || '';
          this.isOtpModalOpen.set(true);
          this.showToast(
            'Perfil corporativo creado. Ingresa el código OTP para activar públicamente tu empresa.',
            'info'
          );
        } else {
          this.showToast('¡Perfil corporativo actualizado exitosamente!', 'success');
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(
          readApiError(err, 'No se pudo guardar el perfil. Verifica los datos ingresados.')
        );
      }
    });
  }
  
  // Verificación OTP Corporativa (POST /api/profiles/organization/verify)
  openOtpModal(): void {
    this.otpErrorMessage.set(null);
    this.otpCode = this.profile().pendingVerificationCode || '';
    this.isOtpModalOpen.set(true);
  }

  submitVerifyOrganization(): void {
    const cleanCode = this.otpCode.trim();
    if (!cleanCode) {
      this.otpErrorMessage.set('Ingresa el código de verificación de 6 dígitos.');
      return;
    }

    this.isVerifyingOtp.set(true);
    this.otpErrorMessage.set(null);

    this.profileService.verifyOrganization(cleanCode).subscribe({
      next: (msg) => {
        this.isVerifyingOtp.set(false);
        this.isOtpModalOpen.set(false);
        this.loadMyRecruiterProfile();
        this.showToast(msg || '¡Organización verificada exitosamente!', 'success');
      },
      error: (err) => {
        this.isVerifyingOtp.set(false);
        this.otpErrorMessage.set(
          readApiError(err, 'Código de verificación incorrecto.')
        );
      }
    });
  }

  handleUnpinImportantPost(postId: string): void {
    this.feedService.toggleImportant(postId).subscribe({
      next: () => {
        this.importantPosts.update((list) => list.filter((p) => p.id !== postId));
        this.showToast('Publicación removida de importantes.', 'info');
      }
    });
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4500);
  }
}