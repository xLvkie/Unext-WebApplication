import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { AppNotification } from '../../core/models/notification.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { readApiError } from '../../core/utils/api-error';
import { formatRelative } from '../../core/utils/format';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [Navbar, RouterLink],
  templateUrl: './notifications.html',
})
export class Notifications {
  private readonly api = inject(NotificationService);
  readonly auth = inject(AuthService);

  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly sessionExpired = signal(false);

  readonly formatRelative = formatRelative;

  constructor() {
    this.load();
  }

  load(): void {
    if (!this.auth.session()) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.list().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.sessionExpired.set(true);
          return;
        }
        this.error.set(readApiError(err, 'No se pudieron cargar tus notificaciones.'));
      },
    });
  }
}
