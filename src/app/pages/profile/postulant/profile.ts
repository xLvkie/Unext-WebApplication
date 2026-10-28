import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../../shared/components/toast/toast';
import { AlertModal } from '../../../shared/components/alert-modal/alert-modal';
import { ProfileSkillsCard } from './components/profile-skills-card/profile-skills-card';
import { ProfileCvCard } from './components/profile-cv-card/profile-cv-card';
import { ProfileSidebar } from './components/profile-sidebar/profile-sidebar';
import { ProfileService } from '../../../core/services/profile.service';
import { ValidationService } from '../../../core/services/validation.service';
import { AuthService } from '../../../core/services/auth.service';
import { DirectoryService } from '../../../core/services/directory.service';
import {
  InstitutionSummary,
  PostulantProfileRequest,
  PostulantProfileResponse,
  StudentSkillRequest,
  StudentSkillResponse
} from '../../../core/models/profile.model';
import {
  AcademicVerificationRequest,
  SkillValidationResponse
} from '../../../core/models/validation.model';
import { readApiError } from '../../../core/utils/api-error';
import { readFileAsDataUrl, resizeImageFile } from '../../../core/utils/file-media';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Navbar,
    Toast,
    AlertModal,
    ProfileSkillsCard,
    ProfileCvCard,
    ProfileSidebar
  ],
  templateUrl: './profile.html'
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);
  private validationService = inject(ValidationService);
  private authService = inject(AuthService);
  readonly directoryService = inject(DirectoryService);
  private router = inject(Router);

  readonly MAX_HEADLINE = 120;
  readonly MAX_BANNER_TEXT = 35;
  readonly MAX_BIO = 1000;
  readonly MAX_TOP_SKILLS = 3;

  isLoading = signal(true);
  isSaving = signal(false);
  isFirstTimeOnboarding = signal(false);

  // Modales
  isEditModalOpen = signal(false);
  isSkillModalOpen = signal(false);
  isBannerModalOpen = signal(false);
  isAcademicModalOpen = signal(false);
  isValidateSkillModalOpen = signal(false);
  isUnverifiedWarningModalOpen = signal(false);

  errorMessage = signal<string | null>(null);
  academicError = signal<string | null>(null);
  skillValidationError = signal<string | null>(null);
  toast = signal<ToastData | null>(null);

  institutions = signal<InstitutionSummary[]>([]);
  validations = signal<SkillValidationResponse[]>([]);

  profile = signal<PostulantProfileResponse>({
    id: '',
    userId: '',
    firstName: '',
    lastName: '',
    skills: []
  });

  form: PostulantProfileRequest = {
    firstName: '',
    lastName: '',
    headline: '',
    bio: '',
    bannerText: '',
    avatarUrl: '',
    bannerUrl: '',
    cvUrl: '',
    cvFileName: '',
    cvFileSize: ''
  };

  academicForm: AcademicVerificationRequest = {
    institutionProfileId: '',
    academicStatus: 'STUDENT',
    institutionalEmail: '',
    studentCode: '',
    career: '',
    currentCycle: 6,
    academicEvidenceUrl: '',
    academicEvidenceName: ''
  };

  skillValidationForm = {
    technicalSkillId: '',
    evidenceUrl: '',
    evidenceFileName: ''
  };

  newSkill: StudentSkillRequest = {
    name: '',
    masteryLevel: 'INTERMEDIO',
    isTopSkill: false
  };

  fullName = computed(() => {
    const f = this.profile().firstName?.trim();
    const l = this.profile().lastName?.trim();
    return f || l ? `${f} ${l}`.trim() : 'Nuevo Postulante';
  });

  initials = computed(() => {
    const f = this.profile().firstName?.charAt(0) || '';
    const l = this.profile().lastName?.charAt(0) || '';
    return (f + l).toUpperCase() || 'U';
  });

  institutionInitials = computed(() => {
    const name = this.profile().institutionName || 'Universidad';
    return (
      name
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3)
        .map((w) => w[0].toUpperCase())
        .join('') || 'UNI'
    );
  });

  hasPendingAcademicRequest = computed(
    () => !!this.profile().institutionProfile && !this.profile().isInstitutionVerified
  );

  topSkills = computed(() =>
    (this.profile().skills || []).filter((s) => Boolean(s.isTopSkill)).slice(0, this.MAX_TOP_SKILLS)
  );

  topSkillsCount = computed(
    () => (this.profile().skills || []).filter((s) => Boolean(s.isTopSkill)).length
  );

  canAddMoreTopSkills = computed(() => this.topSkillsCount() < this.MAX_TOP_SKILLS);

  safeBannerTitle = computed(() => {
    const custom = this.profile().bannerText?.trim();
    const fallback = this.profile().career?.trim() || this.fullName();
    const text = custom || fallback;
    return text.length > this.MAX_BANNER_TEXT ? text.slice(0, this.MAX_BANNER_TEXT) + '…' : text;
  });

  safeBannerSubtitle = computed(() => {
    const h = this.profile().headline?.trim() || 'Talento profesional en Unext';
    return h.length > 65 ? h.slice(0, 65) + '…' : h;
  });

  publicProfileUrl = computed(() => {
    const slug = `${this.profile().firstName || ''}-${this.profile().lastName || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `www.unext.pe/in/${slug || 'mi-perfil'}`;
  });

  suggestedPeers = computed(() =>
    this.directoryService
      .contacts()
      .filter((c) => c.kind === 'Postulante' && c.userId !== this.profile().userId)
      .slice(0, 3)
  );

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.directoryService.load().subscribe();
    this.loadInstitutions();
    this.loadMyProfile();
    this.loadMyValidations();
  }

  loadInstitutions(): void {
    this.profileService.getInstitutionsDirectory().subscribe({
      next: (list) => {
        this.institutions.set(list);
        if (list.length > 0 && !this.academicForm.institutionProfileId) {
          this.academicForm.institutionProfileId = list[0].id;
        }
      }
    });
  }

  loadMyValidations(): void {
    this.validationService.getMyValidations().subscribe({
      next: (list) => this.validations.set(list)
    });
  }

  loadMyProfile(): void {
    this.isLoading.set(true);
    this.profileService.getMyPostulantProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.syncFormWithProfile(data);
        this.isLoading.set(false);

        if (!data.firstName || !data.lastName) {
          this.isFirstTimeOnboarding.set(true);
          this.isEditModalOpen.set(true);
        } else {
          this.isFirstTimeOnboarding.set(false);
          this.authService.markProfileAsCompleted();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.isFirstTimeOnboarding.set(true);
        this.isEditModalOpen.set(true);
      }
    });
  }

  private syncFormWithProfile(p: PostulantProfileResponse): void {
    this.form = {
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      headline: (p.headline || '').slice(0, this.MAX_HEADLINE),
      bio: (p.bio || '').slice(0, this.MAX_BIO),
      bannerText: (p.bannerText || '').slice(0, this.MAX_BANNER_TEXT),
      avatarUrl: p.avatarUrl || '',
      bannerUrl: p.bannerUrl || '',
      cvUrl: p.cvUrl || '',
      cvFileName: p.cvFileName || '',
      cvFileSize: p.cvFileSize || ''
    };

    this.academicForm = {
      institutionProfileId: p.institutionProfile || this.institutions()[0]?.id || '',
      academicStatus: p.academicStatus === 'GRADUATE' ? 'GRADUATE' : 'STUDENT',
      institutionalEmail: p.institutionalEmail || '',
      studentCode: p.studentCode || '',
      career: p.career || '',
      currentCycle: p.currentCycle || 6,
      academicEvidenceUrl: p.academicEvidenceUrl || '',
      academicEvidenceName: p.academicEvidenceName || ''
    };
  }

  // Verificación Académica
  openAcademicVerificationModal(): void {
    this.syncFormWithProfile(this.profile());
    this.academicError.set(null);
    this.isAcademicModalOpen.set(true);
  }

  onAcademicEvidenceSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.academicError.set('El documento de sustento no debe superar los 5 MB.');
      return;
    }

    readFileAsDataUrl(file).then(({ dataUrl, fileName }) => {
      this.academicForm.academicEvidenceUrl = dataUrl;
      this.academicForm.academicEvidenceName = fileName;
    });
  }

  submitAcademicVerification(): void {
    this.academicError.set(null);

    if (!this.academicForm.institutionProfileId) {
      this.academicError.set('Debes seleccionar una institución educativa registrada.');
      return;
    }

    if (this.academicForm.academicStatus === 'STUDENT') {
      if (
        !this.academicForm.institutionalEmail?.trim() ||
        !this.academicForm.studentCode?.trim() ||
        !this.academicForm.career?.trim()
      ) {
        this.academicError.set(
          'Para estudiantes activos, completa tu correo institucional, código de alumno y carrera.'
        );
        return;
      }
    } else if (!this.academicForm.academicEvidenceUrl?.trim()) {
      this.academicError.set('Por favor adjunta tu constancia de egreso o documento de sustento.');
      return;
    }

    this.isSaving.set(true);
    this.validationService.requestAcademicVerification(this.academicForm).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isAcademicModalOpen.set(false);
        this.loadMyProfile();
        this.showToast(
          'Solicitud académica enviada. (Bandeja de notificaciones institucional aún por desarrollar).',
          'info'
        );
      },
      error: (err) => {
        this.isSaving.set(false);
        this.academicError.set(readApiError(err, 'No se pudo enviar la solicitud académica.'));
      }
    });
  }

  // Validación de Habilidades
  openSkillValidationFlow(skill?: StudentSkillResponse): void {
    if (!this.profile().isInstitutionVerified) {
      this.isUnverifiedWarningModalOpen.set(true);
      return;
    }

    const available = (this.profile().skills || []).filter((s) => !s.isValidatedByInstitution);
    this.skillValidationForm = {
      technicalSkillId: skill?.id || available[0]?.id || '',
      evidenceUrl: '',
      evidenceFileName: ''
    };
    this.skillValidationError.set(null);
    this.isValidateSkillModalOpen.set(true);
  }

  onSkillEvidenceFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    readFileAsDataUrl(file).then(({ dataUrl, fileName }) => {
      this.skillValidationForm.evidenceUrl = dataUrl;
      this.skillValidationForm.evidenceFileName = fileName;
    });
  }

  submitSkillValidationRequest(): void {
    if (!this.skillValidationForm.technicalSkillId) {
      this.skillValidationError.set('Selecciona la habilidad que deseas validar.');
      return;
    }
    if (!this.skillValidationForm.evidenceUrl.trim()) {
      this.skillValidationError.set('Ingresa un enlace o adjunta un archivo de evidencia.');
      return;
    }

    const instId = this.profile().institutionProfile;
    if (!instId) return;

    this.isSaving.set(true);
    this.validationService
      .requestSkillValidation({
        institutionProfileId: instId,
        technicalSkillId: this.skillValidationForm.technicalSkillId,
        evidenceUrl: this.skillValidationForm.evidenceUrl.trim()
      })
      .subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.validations.update((prev) => [created, ...prev]);
          this.isValidateSkillModalOpen.set(false);
          this.showToast(
            'Solicitud enviada. Gatillo de notificación disparado en backend.',
            'info'
          );
        },
        error: (err) => {
          this.isSaving.set(false);
          this.skillValidationError.set(readApiError(err, 'No se pudo enviar la solicitud.'));
        }
      });
  }

  // Multimedia (Avatar, Banner y CV usando file-media.ts)
  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    resizeImageFile(file, 400, 400).then((dataUrl) => {
      this.form.avatarUrl = dataUrl;
      if (!this.isFirstTimeOnboarding()) {
        this.quickSavePatch({ avatarUrl: dataUrl }, 'Foto de perfil actualizada.');
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
          'Banner redimensionado (1584×396 px) y guardado.'
        );
        this.isBannerModalOpen.set(false);
      }
    });
  }

  removeCustomBanner(): void {
    this.form.bannerUrl = '';
    if (!this.isFirstTimeOnboarding()) {
      this.quickSavePatch({ bannerUrl: '' }, 'Se restauró el banner autogenerado.');
      this.isBannerModalOpen.set(false);
    }
  }

  saveBannerSettings(): void {
    const cleanText = (this.form.bannerText || '').trim().slice(0, this.MAX_BANNER_TEXT);
    this.quickSavePatch(
      { bannerText: cleanText, bannerUrl: this.form.bannerUrl },
      'Configuración del banner actualizada.'
    );
    this.isBannerModalOpen.set(false);
  }

  onCvSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      this.showToast('Sube únicamente archivos PDF, DOC o DOCX.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showToast('El archivo supera el límite máximo de 5 MB.', 'error');
      return;
    }

    readFileAsDataUrl(file).then(({ dataUrl, fileName, fileSizeLabel }) => {
      this.form.cvUrl = dataUrl;
      this.form.cvFileName = fileName;
      this.form.cvFileSize = fileSizeLabel;

      if (!this.isFirstTimeOnboarding()) {
        this.quickSavePatch(
          { cvUrl: dataUrl, cvFileName: fileName, cvFileSize: fileSizeLabel },
          'Currículum actualizado correctamente.'
        );
      }
    });
  }

  downloadOrOpenCv(): void {
    const url = this.profile().cvUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = this.profile().cvFileName || `CV-${this.fullName()}.pdf`;
    link.click();
  }

  removeCv(): void {
    this.form.cvUrl = '';
    this.form.cvFileName = '';
    this.form.cvFileSize = '';
    if (!this.isFirstTimeOnboarding()) {
      this.quickSavePatch(
        { cvUrl: '', cvFileName: '', cvFileSize: '' },
        'Currículum eliminado de tu perfil.'
      );
    }
  }

  private quickSavePatch(patch: Partial<PostulantProfileRequest>, successMsg: string): void {
    this.profileService.updatePostulantProfile(patch).subscribe({
      next: (saved) => {
        this.profile.set({ ...saved, skills: saved.skills || this.profile().skills || [] });
        this.syncFormWithProfile(this.profile());
        this.showToast(successMsg, 'success');
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
    const first = this.form.firstName.trim();
    const last = this.form.lastName.trim();

    if (!first || !last) {
      this.errorMessage.set('El nombre y los apellidos son obligatorios (*).');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload: PostulantProfileRequest = {
      firstName: first,
      lastName: last,
      headline:
        this.form.headline?.trim().slice(0, this.MAX_HEADLINE) ||
        'Profesional en búsqueda de oportunidades en Unext',
      bio: this.form.bio?.trim().slice(0, this.MAX_BIO) || undefined,
      bannerText: this.form.bannerText?.trim().slice(0, this.MAX_BANNER_TEXT) || undefined,
      avatarUrl: this.form.avatarUrl || undefined,
      bannerUrl: this.form.bannerUrl || undefined,
      cvUrl: this.form.cvUrl || undefined,
      cvFileName: this.form.cvFileName || undefined,
      cvFileSize: this.form.cvFileSize || undefined
    };

    const request$ = this.isFirstTimeOnboarding()
      ? this.profileService.createPostulantProfile(payload)
      : this.profileService.updatePostulantProfile(payload);

    request$.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.profile.set({ ...saved, skills: saved.skills || this.profile().skills || [] });
        this.authService.markProfileAsCompleted();
        this.isFirstTimeOnboarding.set(false);
        this.isEditModalOpen.set(false);
        this.showToast('¡Presentación guardada exitosamente!', 'success');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(readApiError(err, 'No se pudo guardar tu perfil.'));
      }
    });
  }

  openSkillModal(): void {
    this.newSkill = { name: '', masteryLevel: 'INTERMEDIO', isTopSkill: false };
    this.isSkillModalOpen.set(true);
  }

  handleAddSkill(): void {
    if (!this.newSkill.name.trim()) return;

    if (this.newSkill.isTopSkill && !this.canAddMoreTopSkills()) {
      this.showToast('Solo puedes elegir un máximo de 3 aptitudes principales.', 'warning');
      return;
    }

    this.profileService
      .addSkill({
        name: this.newSkill.name.trim(),
        masteryLevel: this.newSkill.masteryLevel,
        isTopSkill: Boolean(this.newSkill.isTopSkill)
      })
      .subscribe({
        next: (created) => {
          this.profile.update((p) => ({
            ...p,
            skills: [...(p.skills || []), created]
          }));
          this.isSkillModalOpen.set(false);
          this.showToast('Habilidad agregada a tu perfil.', 'success');
        },
        error: (err) => {
          this.showToast(readApiError(err, 'No se pudo añadir la habilidad.'), 'error');
        }
      });
  }

  handleToggleTopSkill(skill: StudentSkillResponse): void {
    const nextState = !skill.isTopSkill;

    if (nextState && !this.canAddMoreTopSkills()) {
      this.showToast(
        'Ya alcanzaste el límite de 3 aptitudes principales. Desmarca una primero.',
        'warning'
      );
      return;
    }

    this.profileService.updateSkill(skill.id, { isTopSkill: nextState }).subscribe({
      next: (updated) => {
        this.profile.update((p) => ({
          ...p,
          skills: (p.skills || []).map((s) => (s.id === skill.id ? updated : s))
        }));
        this.showToast(
          nextState
            ? `"${skill.name}" fijada como aptitud principal (${this.topSkillsCount()}/3).`
            : `"${skill.name}" removida de aptitudes principales.`,
          'info'
        );
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo actualizar la aptitud.'), 'error');
      }
    });
  }

  handleDeleteSkill(skillId: string): void {
    this.profileService.deleteSkill(skillId).subscribe({
      next: () => {
        this.profile.update((p) => ({
          ...p,
          skills: (p.skills || []).filter((s) => s.id !== skillId)
        }));
        this.showToast('Habilidad eliminada.', 'info');
      }
    });
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4500);
  }
}