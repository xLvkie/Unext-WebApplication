import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html'
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  selectedRole = signal<UserRole>('POSTULANT');
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage.set('Todos los campos son obligatorios.');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const cleanEmail = this.email.trim();
    const chosenRole = this.selectedRole();

    this.authService
      .register({
        email: cleanEmail,
        password: this.password,
        role: chosenRole
      })
      .subscribe({
        next: (res) => {
          // Si /api/auth/register ya nos devolvió el token JWT y guardó la sesión:
          if (res && res.token && this.authService.getToken()) {
            this.isLoading.set(false);
            this.router.navigate(['/onboarding/complete-profile']);
          } else {
            // Si /api/auth/register solo creó el usuario, iniciamos sesión automáticamente para obtener el JWT
            // y llevarlo directo a completar su perfil sin pasar por la pantalla de Login:
            this.authService.login({ email: cleanEmail, password: this.password }).subscribe({
              next: () => {
                this.isLoading.set(false);
                this.router.navigate(['/onboarding/complete-profile']);
              },
              error: () => {
                this.isLoading.set(false);
                this.router.navigate(['/login']);
              }
            });
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            err?.error?.error ||
              err?.error?.message ||
              'No se pudo completar el registro. Verifica tus datos.'
          );
        }
      });
  }
}