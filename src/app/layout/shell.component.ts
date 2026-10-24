import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { readApiError } from '../core/api-error';
import { AuthService } from '../core/auth.service';
import { DirectoryService } from '../core/directory.service';
import { roleLabel } from '../core/labels';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly directory = inject(DirectoryService);

  readonly loginOpen = signal(!this.auth.session());
  readonly email = signal('');
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly loginError = signal('');

  constructor() {
    if (this.auth.session()) {
      this.auth.hydrate();
      this.directory.load().subscribe();
    }
  }

  openLogin(): void {
    this.loginError.set('');
    this.loginOpen.set(true);
  }

  submit(): void {
    if (!this.email().trim() || !this.password() || this.submitting()) {
      this.loginError.set('Ingresa tu correo y tu contraseña.');
      return;
    }
    this.submitting.set(true);
    this.loginError.set('');
    this.auth.login(this.email().trim(), this.password()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.password.set('');
        this.loginOpen.set(false);
        this.directory.load().subscribe();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.loginError.set(readApiError(error, 'No se pudo iniciar sesión.'));
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.loginOpen.set(true);
  }

  role(): string {
    return roleLabel(this.auth.session()?.role);
  }

  onEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }
}
