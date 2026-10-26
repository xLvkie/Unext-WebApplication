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

    this.authService
      .register({
        email: this.email.trim(),
        password: this.password,
        role: this.selectedRole()
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          // Redirige al formulario de completado de perfil según el rol elegido (falta desarrollar)
          this.router.navigate(['/onboarding/complete-profile']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            err?.error?.error || err?.error?.message || 'No se pudo completar el registro. Verifica tus datos.'
          );
        }
      });
  }
}