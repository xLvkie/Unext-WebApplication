import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html'
})
export class Login {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  email = '';
  password = '';
  rememberMe = false;
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor, completa tu correo y contraseña.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: (session) => {
        const role = session?.role || this.authService.getStoredRole();

        // 1. Si el backend ya nos informa en el login que el perfil NO está completo, va directo a completarlo
        if (session && session.isProfileCompleted === false) {
          this.isLoading.set(false);
          this.router.navigate(['/onboarding/complete-profile']);
          return;
        }

        // 2. Verificación real contra la tabla del segmento en el backend
        if (role === 'POSTULANT') {
          this.profileService.getMyPostulantProfile().subscribe({
            next: (profile) => {
              this.isLoading.set(false);
              if (!profile || !profile.firstName || !profile.lastName) {
                this.router.navigate(['/onboarding/complete-profile']);
              } else {
                this.authService.markProfileAsCompleted();
                this.router.navigate(['/feed']);
              }
            },
            error: () => {
              // 404 Not Found -> Aún no ha completado su perfil de postulante
              this.isLoading.set(false);
              this.router.navigate(['/onboarding/complete-profile']);
            }
          });
        } else if (role === 'RECRUITER') {
          this.profileService.getMyRecruiterProfile().subscribe({
            next: (recProfile) => {
              this.isLoading.set(false);
              if (!recProfile || !recProfile.companyName || !recProfile.ruc) {
                this.router.navigate(['/onboarding/complete-profile']);
              } else {
                this.authService.markProfileAsCompleted();
                // Si aún le falta verificar su código OTP corporativo, lo llevamos a su perfil donde salta el modal OTP
                if (!recProfile.isVerified) {
                  this.router.navigate(['/profile/me']);
                } else {
                  this.router.navigate(['/feed']);
                }
              }
            },
            error: () => {
              // 404 Not Found -> Aún no ha completado su perfil de reclutador
              this.isLoading.set(false);
              this.router.navigate(['/onboarding/complete-profile']);
            }
          });
        } else if (role === 'INSTITUTION') {
          this.profileService.getMyInstitutionProfile().subscribe({
            next: (instProfile) => {
              this.isLoading.set(false);
              if (!instProfile || !instProfile.name || !instProfile.domain) {
                this.router.navigate(['/onboarding/complete-profile']);
              } else {
                this.authService.markProfileAsCompleted();
                this.router.navigate(['/feed']);
              }
            },
            error: () => {
              // 404 Not Found -> Aún no ha completado su perfil institucional
              this.isLoading.set(false);
              this.router.navigate(['/onboarding/complete-profile']);
            }
          });
        } else {
          this.isLoading.set(false);
          this.router.navigate(['/feed']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.error ||
            err?.error?.message ||
            'Credenciales incorrectas. Verifica tu correo y contraseña.'
        );
      }
    });
  }
}