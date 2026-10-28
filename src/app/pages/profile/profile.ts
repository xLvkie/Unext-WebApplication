import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  InstitutionProfileResponse,
  PostulantProfileResponse,
  RecruiterProfileResponse,
} from '../../core/models/profile.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { readApiError } from '../../core/utils/api-error';
import { initials } from '../../core/utils/format';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, Navbar],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  role = this.authService.currentUserRole;
  loading = signal(true);
  error = signal<string | null>(null);
  sessionInvalid = signal(false);
  postulant = signal<PostulantProfileResponse | null>(null);
  recruiter = signal<RecruiterProfileResponse | null>(null);
  institution = signal<InstitutionProfileResponse | null>(null);

  skillName = '';
  skillLevel = '';
  skillBusy = signal(false);
  skillError = signal<string | null>(null);

  editing = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  form = { career: '', currentCycle: null as number | null, cvUrl: '', headline: '', bio: '' };

  fullName = computed(() => {
    const profile = this.postulant();
    return profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
  });
  avatarInitials = computed(() => initials(this.fullName()));

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.sessionInvalid.set(true);
      this.loading.set(false);
      return;
    }
    switch (this.role()) {
      case 'RECRUITER':
        this.loadRecruiter();
        break;
      case 'INSTITUTION':
        this.loadInstitution();
        break;
      default:
        this.loadPostulant();
    }
  }

  startEdit(): void {
    const profile = this.postulant();
    if (!profile) {
      return;
    }
    this.form = {
      career: profile.career ?? '',
      currentCycle: profile.currentCycle,
      cvUrl: profile.cvUrl ?? '',
      headline: profile.headline ?? '',
      bio: profile.bio ?? '',
    };
    this.formError.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveProfile(): void {
    const { career, currentCycle, cvUrl, headline, bio } = this.form;
    if (currentCycle != null && currentCycle < 1) {
      this.formError.set('El ciclo debe ser un número mayor o igual a 1.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.profileService
      .updateMyPostulantProfile({
        career: career.trim(),
        ...(currentCycle != null && { currentCycle }),
        cvUrl: cvUrl.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
      })
      .subscribe({
        next: (profile) => {
          this.postulant.set(profile);
          this.saving.set(false);
          this.editing.set(false);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.sessionInvalid.set(true);
          } else {
            this.formError.set(readApiError(err, 'No se pudo guardar tu perfil.'));
          }
        },
      });
  }

  addSkill(): void {
    const profile = this.postulant();
    const name = this.skillName.trim();
    const masteryLevel = this.skillLevel.trim();
    if (!profile || !name || !masteryLevel) {
      this.skillError.set('Escribe el nombre y el nivel de dominio.');
      return;
    }
    this.skillBusy.set(true);
    this.skillError.set(null);
    this.profileService.addSkill({ name, masteryLevel }).subscribe({
      next: (skill) => {
        this.postulant.set({ ...profile, skills: [...profile.skills, skill] });
        this.skillName = '';
        this.skillLevel = '';
        this.skillBusy.set(false);
      },
      error: (err: unknown) => this.failSkill(err, 'No se pudo agregar la habilidad.'),
    });
  }

  removeSkill(skillId: string): void {
    const profile = this.postulant();
    if (!profile) {
      return;
    }
    this.skillBusy.set(true);
    this.skillError.set(null);
    this.profileService.deleteSkill(skillId).subscribe({
      next: () => {
        this.postulant.set({ ...profile, skills: profile.skills.filter((s) => s.id !== skillId) });
        this.skillBusy.set(false);
      },
      error: (err: unknown) => this.failSkill(err, 'No se pudo eliminar la habilidad.'),
    });
  }

  private failSkill(err: unknown, fallback: string): void {
    this.skillBusy.set(false);
    if (err instanceof HttpErrorResponse && err.status === 401) {
      this.sessionInvalid.set(true);
    } else {
      this.skillError.set(readApiError(err, fallback));
    }
  }

  private loadPostulant(): void {
    this.profileService.getMyPostulantProfile().subscribe({
      next: (profile) => {
        this.postulant.set(profile);
        this.loading.set(false);
      },
      error: (err: unknown) => this.fail(err, 'No se pudo cargar tu perfil.'),
    });
  }

  private loadRecruiter(): void {
    this.profileService.getMyRecruiterProfile().subscribe({
      next: (profile) => {
        this.recruiter.set(profile);
        this.loading.set(false);
      },
      error: (err: unknown) => this.fail(err, 'No se pudo cargar el perfil de tu empresa.'),
    });
  }

  private loadInstitution(): void {
    this.profileService.getMyInstitutionProfile().subscribe({
      next: (profile) => {
        this.institution.set(profile);
        this.loading.set(false);
      },
      error: (err: unknown) => this.fail(err, 'No se pudo cargar el perfil de tu institución.'),
    });
  }

  private fail(err: unknown, fallback: string): void {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      this.sessionInvalid.set(true);
    } else {
      this.error.set(readApiError(err, fallback));
    }
    this.loading.set(false);
  }
}
