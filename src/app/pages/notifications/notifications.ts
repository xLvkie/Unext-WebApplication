import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { AppNotification } from '../../core/models/notification.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { readApiError } from '../../core/utils/api-error';
import { formatRelative } from '../../core/utils/format';
import { Navbar } from '../../shared/components/navbar/navbar';

const PAGE_SIZE = 10;

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
  readonly visibleCount = signal(PAGE_SIZE);
  readonly actionError = signal('');
  private readonly marking = new Set<string>();

  readonly visibleItems = computed(() => this.items().slice(0, this.visibleCount()));
  readonly remaining = computed(() => Math.max(0, this.items().length - this.visibleCount()));
  readonly nextBatch = computed(() => Math.min(PAGE_SIZE, this.remaining()));

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
        this.visibleCount.set(PAGE_SIZE);
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

  showMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  markAsRead(item: AppNotification): void {
    if (item.isRead || this.marking.has(item.id)) {
      return;
    }
    this.marking.add(item.id);
    this.actionError.set('');
    this.api.markAsRead(item.id).subscribe({
      next: (updated) => {
        this.marking.delete(item.id);
        this.items.update((list) =>
          list.map((current) =>
            current.id === item.id ? { ...current, ...updated, isRead: true } : current,
          ),
        );
      },
      error: (err) => {
        this.marking.delete(item.id);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.sessionExpired.set(true);
          return;
        }
        this.actionError.set(readApiError(err, 'No se pudo marcar la notificación como leída.'));
      },
    });
  }
}
