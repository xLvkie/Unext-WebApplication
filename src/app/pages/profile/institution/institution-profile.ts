import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../../shared/components/toast/toast';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { DirectoryService } from '../../../core/services/directory.service';
import {
  InstitutionProfileRequest,
  InstitutionProfileResponse,
  InstitutionProfileUpdate
} from '../../../core/models/profile.model';
import { readApiError } from '../../../core/utils/api-error';
import { resizeImageFile } from '../../../core/utils/file-media';

export interface PendingStudentItem {
  postulantId: string;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
}

export interface PendingValidationItem {
  validationId: string;
  studentName: string;
  skillName: string;
  evidenceUrl?: string;
  status: string;
}

@Component({
  selector: 'app-institution-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, Toast],
  templateUrl: './institution-profile.html'
})
export class InstitutionProfile implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  readonly directoryService = inject(DirectoryService);
  private router = inject(Router);

  isLoading = signal(true);
  isSaving = signal(false);
  isVerifyingOtp = signal(false);
  isFirstTimeOnboarding = signal(false);

  // Pestaña activa del panel institucional
  activeTab = signal<'overview' | 'students' | 'skills' | 'agreements'>('overview');

  // Modales
  isEditModalOpen = signal(false);
  isOtpModalOpen = signal(false);

  otpCode = '';
  errorMessage = signal<string | null>(null);
  otpErrorMessage = signal<string | null>(null);
  toast = signal<ToastData | null>(null);

  // Estadísticas institucionales cargadas del backend
  stats = signal({
    totalStudents: 0,
    pendingVerifications: 0,
    activeAgreements: 0,
    endorsedCompanies: 0
  });

  // Alumnos y habilidades pendientes cargados de la base de datos
  pendingStudents = signal<PendingStudentItem[]>([]);
  pendingValidations = signal<PendingValidationItem[]>([]);
  agreements = signal<any[]>([]);

  profile = signal<InstitutionProfileResponse>({
    id: '',
    userId: '',
    name: '',
    domain: '',
    logoUrl: null,
    description: null,
    isVerified: false
  });

  form = {
    institutionName: '',
    domain: '',
    logoUrl: '',
    description: ''
  };

  institutionInitials = computed(() => {
    const name = this.profile().name?.trim() || 'Institución';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || 'IN'
    );
  });

  safeDomain = computed(() => {
    const d = this.profile().domain?.trim();
    return d ? (d.startsWith('http') ? d : `www.${d}`) : 'portal.edu.pe';
  });

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
        }

        // Recuperar OTP guardado en sesión si la institución no está verificada aún
        const storedOtp = sessionStorage.getItem(`unext_inst_otp_${data.userId || 'me'}`);
        if (storedOtp && !data.isVerified) {
          this.otpCode = storedOtp;
        }

        this.loadInstitutionStats();
        this.loadPendingStudents();
        this.loadPendingValidations();
        this.loadAgreements();
      },
      error: () => {
        // 404 / 500: Aún no tiene perfil de institución en base de datos -> Onboarding
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
      description: p.description || ''
    };
  }

  loadInstitutionStats(): void {
    this.http.get<any>(`${environment.apiUrl}/institution/dashboard/stats`).subscribe({
      next: (s) => {
        if (s) {
          this.stats.update((prev) => ({
            ...prev,
            totalStudents: s.totalVerifiedStudents ?? s.totalStudents ?? prev.totalStudents,
            activeAgreements: s.totalActiveAgreements ?? prev.activeAgreements,
            endorsedCompanies: s.totalEndorsedCompanies ?? prev.endorsedCompanies
          }));
        }
      },
      error: () => {
        // Silencioso si no hay métricas todavía
      }
    });
  }

  loadPendingStudents(): void {
    this.http.get<PendingStudentItem[]>(`${environment.apiUrl}/institution/students/pending`).subscribe({
      next: (list) => {
        const students = list || [];
        this.pendingStudents.set(students);
        this.stats.update((prev) => ({
          ...prev,
          pendingVerifications: students.length + this.pendingValidations().length
        }));
      },
      error: () => {
        this.pendingStudents.set([]);
      }
    });
  }

  loadPendingValidations(): void {
    this.http.get<PendingValidationItem[]>(`${environment.apiUrl}/institution/validations/pending`).subscribe({
      next: (list) => {
        const validations = list || [];
        this.pendingValidations.set(validations);
        this.stats.update((prev) => ({
          ...prev,
          pendingVerifications: this.pendingStudents().length + validations.length
        }));
      },
      error: () => {
        this.pendingValidations.set([]);
      }
    });
  }

  loadAgreements(): void {
    this.http.get<any[]>(`${environment.apiUrl}/institution/agreements`).subscribe({
      next: (list) => {
        const ags = list || [];
        this.agreements.set(ags);
        this.stats.update((prev) => ({
          ...prev,
          activeAgreements: ags.length
        }));
      },
      error: () => {
        this.agreements.set([]);
      }
    });
  }

  // Subida de Logotipo Institucional
  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    resizeImageFile(file, 400, 400).then((dataUrl) => {
      this.form.logoUrl = dataUrl;
      if (!this.isFirstTimeOnboarding() && this.profile().id) {
        this.profileService
          .updateMyInstitutionProfile({ logoUrl: dataUrl })
          .subscribe({
            next: (saved) => {
              this.profile.set(saved);
              this.showToast('Logotipo institucional actualizado.', 'success');
            }
          });
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
    let domain = this.form.domain.trim().toLowerCase();

    // Limpieza de prefijos comunes (https://, http://, www.) y rutas
    domain = domain
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .trim();

    if (!name || !domain) {
      this.errorMessage.set('El nombre de la institución y el dominio oficial son obligatorios (*).');
      return;
    }

    if (!domain.includes('.') || domain.length < 4) {
      this.errorMessage.set('Ingresa un dominio web válido (ejemplo: ulima.edu.pe, pucp.edu.pe).');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    if (this.isFirstTimeOnboarding()) {
      // POST /api/profiles/institution/me
      const requestPayload: InstitutionProfileRequest = {
        institutionName: name,
        domain
      };

      this.profileService.createInstitutionProfile(requestPayload).subscribe({
        next: (responseMsg) => {
          // Extraemos el código OTP de prueba generado por el backend
          const otpMatch = (responseMsg || '').match(/\d{6}/);
          if (otpMatch) {
            this.otpCode = otpMatch[0];
            sessionStorage.setItem(`unext_inst_otp_${this.profile().userId || 'me'}`, this.otpCode);
          }

          // Si el usuario también agregó descripción o logotipo, actualizamos con PUT
          if (this.form.logoUrl || this.form.description.trim()) {
            this.profileService
              .updateMyInstitutionProfile({
                name,
                domain,
                logoUrl: this.form.logoUrl || undefined,
                description: this.form.description.trim() || undefined
              })
              .subscribe({
                next: (saved) => {
                  this.finishOnboardingSuccess(saved);
                },
                error: () => {
                  this.finishOnboardingSuccess();
                }
              });
          } else {
            this.finishOnboardingSuccess();
          }
        },
        error: (err) => {
          const errDetail = readApiError(err, '');

          // Si el backend responde que el perfil ya está completado, procedemos a actualizarlo directamente
          if (
            errDetail.includes('ya está completado') ||
            errDetail.includes('ya existe') ||
            err?.error?.message?.includes('completado')
          ) {
            this.profileService
              .updateMyInstitutionProfile({
                name,
                domain,
                logoUrl: this.form.logoUrl || undefined,
                description: this.form.description.trim() || undefined
              })
              .subscribe({
                next: (saved) => {
                  this.finishOnboardingSuccess(saved);
                },
                error: (updErr) => {
                  this.isSaving.set(false);
                  this.errorMessage.set(
                    readApiError(updErr, 'No se pudo actualizar el perfil de la institución.')
                  );
                }
              });
            return;
          }

          this.isSaving.set(false);

          if (errDetail.includes('dominio institucional ya está registrado')) {
            this.errorMessage.set(
              `El dominio "${domain}" ya se encuentra registrado por otra institución. Si tu casa de estudios es diferente, ingresa su dominio oficial (ej: pucp.edu.pe, ulima.edu.pe, unmsm.edu.pe).`
            );
          } else {
            this.errorMessage.set(
              readApiError(
                err,
                'No se pudo registrar la institución. Verifica que el dominio no esté en uso.'
              )
            );
          }
        }
      });
    } else {
      // PUT /api/profiles/institution/me
      const updatePayload: InstitutionProfileUpdate = {
        name,
        domain,
        logoUrl: this.form.logoUrl || undefined,
        description: this.form.description?.trim() || undefined
      };

      this.profileService.updateMyInstitutionProfile(updatePayload).subscribe({
        next: (saved) => {
          this.isSaving.set(false);
          this.profile.set(saved);
          this.isEditModalOpen.set(false);
          this.showToast('¡Perfil institucional actualizado exitosamente!', 'success');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            readApiError(err, 'No se pudieron guardar los cambios institucionales.')
          );
        }
      });
    }
  }

  private finishOnboardingSuccess(alreadySaved?: InstitutionProfileResponse): void {
    this.isSaving.set(false);
    this.isFirstTimeOnboarding.set(false);
    this.isEditModalOpen.set(false);
    this.authService.markProfileAsCompleted();

    if (alreadySaved) {
      this.profile.set(alreadySaved);
      this.syncFormWithProfile(alreadySaved);
    } else {
      this.loadMyInstitutionProfile();
    }

    this.showToast('¡Perfil institucional configurado con éxito!', 'success');

    // Cambiamos la URL a /profile/me
    this.router.navigate(['/profile/me'], { replaceUrl: true });

    // Si tenemos el código OTP generado, abrimos de inmediato el cuestionario de validación
    if (this.otpCode) {
      this.isOtpModalOpen.set(true);
    }
  }

  // Verificación OTP Institucional (POST /api/profiles/organization/verify)
  openOtpModal(): void {
    this.otpErrorMessage.set(null);
    if (!this.otpCode && this.profile().userId) {
      const stored = sessionStorage.getItem(`unext_inst_otp_${this.profile().userId}`);
      if (stored) this.otpCode = stored;
    }
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
        this.profile.update((p) => ({ ...p, isVerified: true }));
        this.showToast(msg || '¡Institución verificada exitosamente!', 'success');
      },
      error: (err) => {
        this.isVerifyingOtp.set(false);
        this.otpErrorMessage.set(
          readApiError(err, 'Código de verificación incorrecto o expirado.')
        );
      }
    });
  }

  // Gestión de Alumnos y Habilidades en el Panel Institucional
  verifyStudent(postulantId: string, status: 'APPROVED' | 'REJECTED'): void {
    this.http
      .patch<string>(
        `${environment.apiUrl}/institution/students/${postulantId}/verify?status=${status}`,
        {},
        { responseType: 'text' as 'json' }
      )
      .subscribe({
        next: (msg) => {
          this.showToast(
            status === 'APPROVED' ? 'Alumno verificado con éxito.' : 'Solicitud académica rechazada.',
            status === 'APPROVED' ? 'success' : 'info'
          );
          this.loadPendingStudents();
          this.loadInstitutionStats();
        },
        error: (err) => {
          this.showToast(readApiError(err, 'No se pudo actualizar el estado del alumno.'), 'error');
        }
      });
  }

  verifySkill(validationId: string, status: 'APPROVED' | 'REJECTED'): void {
    this.http
      .patch<string>(
        `${environment.apiUrl}/institution/validations/${validationId}/status`,
        { status },
        { responseType: 'text' as 'json' }
      )
      .subscribe({
        next: () => {
          this.showToast(
            status === 'APPROVED'
              ? 'Habilidad técnica certificada con aval institucional.'
              : 'Validación de habilidad rechazada.',
            status === 'APPROVED' ? 'success' : 'info'
          );
          this.loadPendingValidations();
          this.loadInstitutionStats();
        },
        error: (err) => {
          this.showToast(
            readApiError(err, 'No se pudo actualizar la validación de habilidad.'),
            'error'
          );
        }
      });
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4500);
  }
}
