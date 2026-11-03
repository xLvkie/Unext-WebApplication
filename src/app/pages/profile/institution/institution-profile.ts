import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../../shared/components/toast/toast';
import { ProfileService } from '../../../core/services/profile.service';
import { FeedService } from '../../../core/services/feed.service';
import { AuthService } from '../../../core/services/auth.service';
import { DirectoryService } from '../../../core/services/directory.service';
import {
  InstitutionProfileRequest,
  InstitutionProfileResponse,
  InstitutionProfileUpdate
} from '../../../core/models/profile.model';
import { FeedPostResponse } from '../../../core/models/feed.model';
import { readApiError } from '../../../core/utils/api-error';
import { resizeImageFile } from '../../../core/utils/file-media';
import { toDate } from '../../../core/utils/format';

export interface EndorsedCompanyItem {
  recruiterId: string;
  companyName: string;
  endorsedAt?: string | number[] | Date;
}

@Component({
  selector: 'app-institution-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, Toast],
  templateUrl: './institution-profile.html'
})
export class InstitutionProfile implements OnInit {
  private profileService = inject(ProfileService);
  private feedService = inject(FeedService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  readonly directoryService = inject(DirectoryService);
  private router = inject(Router);

  readonly MAX_BANNER_TEXT = 35;
  readonly MAX_DESCRIPTION = 1500;
  readonly MAX_IMPORTANT_POSTS = 6; 

  isLoading = signal(true);
  isSaving = signal(false);
  isVerifyingOtp = signal(false);
  isFirstTimeOnboarding = signal(false);

  // Modales
  isEditModalOpen = signal(false);
  isBannerModalOpen = signal(false);
  isOtpModalOpen = signal(false);

  // Pestaña activa en la Card de Publicaciones Oficiales
  postsTab = signal<'IMPORTANT' | 'NORMAL'>('IMPORTANT');

  otpCode = '';
  errorMessage = signal<string | null>(null);
  otpErrorMessage = signal<string | null>(null);
  toast = signal<ToastData | null>(null);

  allInstitutionPosts = signal<FeedPostResponse[]>([]);
  endorsedCompanies = signal<EndorsedCompanyItem[]>([]);

  otpDigits: string[] = ['', '', '', '', '', ''];
  isResendingOtp = signal(false);

  stats = signal({
    totalVerifiedStudents: 0,
    totalHiredStudents: 0,
    totalActiveAgreements: 0,
    totalEndorsedCompanies: 0,
    employabilityRate: 0,
    pendingStudents: 0,
    pendingSkills: 0
  });

  profile = signal<InstitutionProfileResponse>({
    id: '',
    userId: '',
    name: '',
    domain: '',
    logoUrl: null,
    bannerUrl: null,
    bannerText: null,
    description: null,
    isVerified: false,
    pendingVerificationCode: null
  });

  form = {
    institutionName: '',
    domain: '',
    logoUrl: '',
    bannerUrl: '',
    bannerText: '',
    description: ''
  };

  importantPosts = computed(() =>
    this.allInstitutionPosts().filter((p) => Boolean(p.isImportant))
  );

  normalPosts = computed(() =>
    this.allInstitutionPosts().filter((p) => !p.isImportant)
  );

  institutionInitials = computed(() => {
    const name = this.profile().name?.trim() || 'Institución';
    return (
      name
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || 'UNI'
    );
  });

  safeDomain = computed(() => {
    const d = this.profile().domain?.trim();
    return d ? (d.startsWith('http') ? d : `www.${d}`) : 'portal.edu.pe';
  });

  safeBannerTitle = computed(() => {
    const custom = this.profile().bannerText?.trim();
    const fallback = this.profile().name?.trim() || 'Portal Institucional';
    const text = custom || fallback;
    return text.length > this.MAX_BANNER_TEXT ? text.slice(0, this.MAX_BANNER_TEXT) + '…' : text;
  });

  safeBannerSubtitle = computed(() => {
    const d = this.profile().domain?.trim();
    return d
      ? `Institución Educativa Oficial · Dominio @${d}`
      : 'Educación Superior y Acreditación Académica en Unext';
  });

  suggestedPeers = computed(() =>
    this.directoryService.dailyCommunityPeers(this.profile().userId, 6)
  );
  
  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.directoryService.load().subscribe();
    this.loadMyInstitutionProfile();
  }

  loadMyInstitutionProfile(): void {
    this.isLoading.set(true);
    this.profileService.getMyInstitutionProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.syncFormWithProfile(data);
        this.isLoading.set(false);

        if (!data.name || !data.domain) {
          this.isFirstTimeOnboarding.set(true);
          this.isEditModalOpen.set(true);
        } else {
          this.isFirstTimeOnboarding.set(false);
          this.authService.markProfileAsCompleted();

          // Si aún no está verificada por OTP, abrimos automáticamente el modal con el código de seguridad
          if (!data.isVerified) {
            this.otpCode =
              data.pendingVerificationCode ||
              sessionStorage.getItem(`unext_inst_otp_${data.userId || 'me'}`) ||
              '';
            this.isOtpModalOpen.set(true);
          }
        }

        if (data.userId) {
          this.loadInstitutionPosts(data.userId);
        }
        this.loadInstitutionSummaryData();
      },
      error: () => {
        this.isLoading.set(false);
        this.isFirstTimeOnboarding.set(true);
        this.isEditModalOpen.set(true);
      }
    });
  }

  private syncFormWithProfile(p: InstitutionProfileResponse): void {
    this.form = {
      institutionName: p.name || '',
      domain: p.domain || '',
      logoUrl: p.logoUrl || '',
      bannerUrl: p.bannerUrl || '',
      bannerText: (p.bannerText || '').slice(0, this.MAX_BANNER_TEXT),
      description: (p.description || '').slice(0, this.MAX_DESCRIPTION)
    };
  }

  private loadInstitutionPosts(userId: string): void {
    this.feedService.getPostsByUser(userId).subscribe({
      next: (posts) => this.allInstitutionPosts.set(posts),
      error: () => this.allInstitutionPosts.set([])
    });
  }

  private loadInstitutionSummaryData(): void {
    this.http.get<any>(`${environment.apiUrl}/institution/dashboard/stats`).subscribe({
      next: (s) => {
        if (s) {
          this.stats.update((prev) => ({
            ...prev,
            totalVerifiedStudents: s.totalVerifiedStudents ?? 0,
            totalHiredStudents: s.totalHiredStudents ?? 0,
            totalActiveAgreements: s.totalActiveAgreements ?? 0,
            totalEndorsedCompanies: s.totalEndorsedCompanies ?? 0,
            employabilityRate: s.employabilityRate ?? 0
          }));
        }
      },
      error: () => {}
    });

    this.http.get<any[]>(`${environment.apiUrl}/institution/students/pending`).subscribe({
      next: (list) =>
        this.stats.update((prev) => ({ ...prev, pendingStudents: (list || []).length })),
      error: () => {}
    });

    this.http.get<any[]>(`${environment.apiUrl}/institution/validations/pending`).subscribe({
      next: (list) =>
        this.stats.update((prev) => ({ ...prev, pendingSkills: (list || []).length })),
      error: () => {}
    });

    this.http.get<EndorsedCompanyItem[]>(`${environment.apiUrl}/institution/companies/endorsed`).subscribe({
      next: (list) => this.endorsedCompanies.set(list || []),
      error: () => this.endorsedCompanies.set([])
    });
  }

  // Subida y redimensionado de Escudo/Logo (400x400) y Portada (1584x396)
  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    resizeImageFile(file, 400, 400).then((dataUrl) => {
      this.form.logoUrl = dataUrl;
      if (!this.isFirstTimeOnboarding()) {
        this.quickSavePatch({ logoUrl: dataUrl }, 'Escudo institucional actualizado.');
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
          'Portada institucional redimensionada (1584×396 px) y guardada.'
        );
        this.isBannerModalOpen.set(false);
      }
    });
  }

  removeCustomBanner(): void {
    this.form.bannerUrl = '';
    if (!this.isFirstTimeOnboarding()) {
      this.quickSavePatch({ bannerUrl: '' }, 'Se restauró la portada institucional autogenerada.');
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

  private quickSavePatch(patch: InstitutionProfileUpdate, successMsg: string): void {
    this.profileService.updateMyInstitutionProfile(patch).subscribe({
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
    const name = this.form.institutionName.trim();
    const cleanDomain = this.form.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .trim();

    const wasFirstTime = this.isFirstTimeOnboarding();

    if (!name || !cleanDomain) {
      this.errorMessage.set('El nombre de la institución y el dominio oficial son obligatorios (*).');
      return;
    }

    if (!cleanDomain.includes('.') || cleanDomain.length < 4) {
      this.errorMessage.set('Ingresa un dominio educativo válido (ej. upc.edu.pe, pucp.edu.pe).');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const updatePayload: InstitutionProfileUpdate = {
      name,
      domain: cleanDomain,
      logoUrl: this.form.logoUrl || undefined,
      bannerUrl: this.form.bannerUrl || undefined,
      bannerText: this.form.bannerText?.trim().slice(0, this.MAX_BANNER_TEXT) || undefined,
      description: this.form.description?.trim().slice(0, this.MAX_DESCRIPTION) || undefined
    };

    if (wasFirstTime) {
      const createPayload: InstitutionProfileRequest = {
        institutionName: name,
        domain: cleanDomain
      };

      this.profileService.createInstitutionProfile(createPayload).subscribe({
        next: (responseText) => {
          const otpMatch = (responseText || '').match(/\d{6}/);
          if (otpMatch) {
            this.otpCode = otpMatch[0];
            sessionStorage.setItem(`unext_inst_otp_${this.profile().userId || 'me'}`, this.otpCode);
          }

          // Guardamos también logo, banner y descripción si los completó en el mismo paso
          this.profileService.updateMyInstitutionProfile(updatePayload).subscribe({
            next: (saved) => this.finishOnboarding(saved),
            error: () => this.finishOnboarding()
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            readApiError(err, 'No se pudo registrar la institución. Verifica que el dominio no esté duplicado.')
          );
        }
      });
    } else {
      this.profileService.updateMyInstitutionProfile(updatePayload).subscribe({
        next: (saved) => {
          this.isSaving.set(false);
          this.profile.set(saved);
          this.syncFormWithProfile(saved);
          this.isEditModalOpen.set(false);
          this.showToast('¡Perfil institucional actualizado exitosamente!', 'success');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(readApiError(err, 'No se pudieron guardar los cambios.'));
        }
      });
    }
  }

  private finishOnboarding(saved?: InstitutionProfileResponse): void {
    this.isSaving.set(false);
    this.isFirstTimeOnboarding.set(false);
    this.isEditModalOpen.set(false);
    this.authService.markProfileAsCompleted();

    if (saved) {
      this.profile.set(saved);
      this.syncFormWithProfile(saved);
      if (!saved.isVerified) {
        this.otpCode = saved.pendingVerificationCode || this.otpCode;
        this.isOtpModalOpen.set(true);
      }
    } else {
      this.loadMyInstitutionProfile();
    }

    this.showToast(
      'Perfil institucional creado. Ingresa el código de seguridad OTP para acreditar tu dominio.',
      'info'
    );
  }

  // Verificación Institucional por Código OTP
  openOtpModal(): void {
    this.otpErrorMessage.set(null);
    const currentCode = (this.profile().pendingVerificationCode || '').trim();
    if (currentCode.length === 6) {
      this.otpCode = currentCode;
      this.otpDigits = currentCode.split('');
    } else {
      this.otpDigits = ['', '', '', '', '', ''];
      this.otpCode = '';
      // Si por alguna razón aún no tenía código en memoria, lo solicitamos al backend automáticamente
      this.requestNewOtpCode(true);
    }
    this.isOtpModalOpen.set(true);
  }

  onOtpDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);
    this.otpDigits[index] = val;
    input.value = val;
    this.otpCode = this.otpDigits.join('');

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-box-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
      nextInput?.select();
    }
  }

  onOtpDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-box-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = pasted[i] || '';
    }
    this.otpCode = this.otpDigits.join('');
  }

  fillOtpFromBackendBadge(): void {
    const code = (this.profile().pendingVerificationCode || '').trim();
    if (code.length === 6) {
      this.otpDigits = code.split('');
      this.otpCode = code;
    }
  }

  requestNewOtpCode(silent = false): void {
    this.isResendingOtp.set(true);
    this.otpErrorMessage.set(null);

    this.profileService.resendOrganizationCode().subscribe({
      next: (res) => {
        this.isResendingOtp.set(false);
        if (res.code) {
          this.profile.update((p) => ({ ...p, pendingVerificationCode: res.code }));
          this.otpDigits = res.code.split('');
          this.otpCode = res.code;
        }
        if (!silent) {
          this.showToast('Nuevo código generado y enviado a tus notificaciones.', 'info');
        }
      },
      error: (err) => {
        this.isResendingOtp.set(false);
        if (!silent) {
          this.otpErrorMessage.set(readApiError(err, 'No se pudo generar un nuevo código.'));
        }
      }
    });
  }

  submitVerifyOrganization(): void {
    const cleanCode = this.otpDigits.join('').trim() || this.otpCode.trim();
    if (cleanCode.length !== 6) {
      this.otpErrorMessage.set('Completa los 6 dígitos del código de verificación.');
      return;
    }

    this.isVerifyingOtp.set(true);
    this.otpErrorMessage.set(null);

    this.profileService.verifyOrganization(cleanCode).subscribe({
      next: (msg) => {
        this.isVerifyingOtp.set(false);
        this.isOtpModalOpen.set(false);
        this.profile.update((curr) => ({
          ...curr,
          isVerified: true,
          pendingVerificationCode: null
        }));
        this.showToast(msg || '¡Organización verificada exitosamente!', 'success');
      },
      error: (err) => {
        this.isVerifyingOtp.set(false);
        this.otpErrorMessage.set(
          readApiError(err, 'Código de verificación incorrecto. Solicita uno nuevo si expiró.')
        );
      }
    });
  }

  // Manejo de Publicaciones Importantes vs Normales
  handleToggleImportantPost(post: FeedPostResponse): void {
    this.feedService.toggleImportant(post.id).subscribe({
      next: (updated) => {
        this.allInstitutionPosts.update((list) =>
          list.map((p) =>
            p.id === post.id
              ? { ...p, isImportant: updated.isImportant, expiresAt: updated.expiresAt }
              : p
          )
        );
        this.showToast(
          updated.isImportant
            ? '📌 Comunicado fijado en Publicaciones Importantes.'
            : 'Comunicado movido a Publicaciones Normales (expira en 7 días).',
          'info'
        );
      },
      error: (err) => {
        this.showToast(
          readApiError(err, `Solo puedes fijar hasta ${this.MAX_IMPORTANT_POSTS} publicaciones importantes.`),
          'warning'
        );
      }
    });
  }

  handleDeletePost(postId: string): void {
    if (!confirm('¿Deseas eliminar esta publicación institucional?')) return;

    this.feedService.deletePost(postId).subscribe({
      next: () => {
        this.allInstitutionPosts.update((list) => list.filter((p) => p.id !== postId));
        this.showToast('Publicación eliminada.', 'info');
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo eliminar la publicación.'), 'error');
      }
    });
  }

  isVideo(url: string): boolean {
    return url.startsWith('data:video/') || /\.(mp4|webm|ogg)$/i.test(url);
  }

  formatPostDate(value: unknown): string {
    const d = toDate(value);
    if (!d) return 'Reciente';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatExpirationRemaining(expiresAt: unknown): string {
    const exp = toDate(expiresAt);
    if (!exp) return '7 días restantes';
    const diffMs = exp.getTime() - Date.now();
    if (diffMs <= 0) return 'Por expirar';
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} días restantes`;
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4500);
  }
}