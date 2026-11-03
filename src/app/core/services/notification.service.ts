import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, catchError, interval, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationItem } from '../models/notification.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/notifications`;

  private pollingSub: Subscription | null = null;

  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.isRead).length
  );

  /**
   * Inicia la sincronización automática en segundo plano (cada 10s)
   * para que el badge de notificaciones en el Navbar se actualice en tiempo real
   * sin obligar al usuario a cambiar de página.
   */
  startPolling(): void {
    if (this.pollingSub) return;

    this.refreshQuietly();
    this.pollingSub = interval(10000).subscribe(() => {
      if (this.authService.getToken()) {
        this.refreshQuietly();
      } else {
        this.stopPolling();
      }
    });
  }

  stopPolling(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = null;
  }

  refreshQuietly(): void {
    if (!this.authService.getToken()) return;
    this.http
      .get<NotificationItem[]>(this.API_URL)
      .pipe(catchError(() => of(null)))
      .subscribe((list) => {
        if (list) {
          this.notifications.set(list);
        }
      });
  }

  getMyNotifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(this.API_URL).pipe(
      tap((list) => this.notifications.set(list))
    );
  }

  markAsRead(notificationId: string): Observable<NotificationItem> {
    return this.http
      .patch<NotificationItem>(`${this.API_URL}/${notificationId}/read`, {})
      .pipe(
        tap((updated) => {
          this.notifications.update((items) =>
            items.map((item) =>
              item.id === notificationId ? { ...item, ...updated, isRead: true } : item
            )
          );
        })
      );
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/read-all`, {}).pipe(
      tap(() => {
        this.notifications.update((items) =>
          items.map((item) => ({ ...item, isRead: true }))
        );
      })
    );
  }

  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${notificationId}`).pipe(
      tap(() => {
        this.notifications.update((items) =>
          items.filter((item) => item.id !== notificationId)
        );
      })
    );
  }
}