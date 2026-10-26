import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html'
})
export class Login {
  private authService = inject(AuthService);
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
      next: () => {
        this.isLoading.set(false);
        const role = this.authService.getStoredRole();
        // Redirige según el rol o al feed principal (falta desarrollar)
        if (role === 'RECRUITER' || role === 'INSTITUTION' || role === 'POSTULANT') {
          this.router.navigate(['/feed']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.error || err?.error?.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.'
        );
      }
    });
  }
}