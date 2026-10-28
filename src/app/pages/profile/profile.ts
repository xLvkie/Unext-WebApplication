import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
  imports: [RouterLink, Navbar],
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
