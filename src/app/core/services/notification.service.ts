import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationItem } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/notifications`;

  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.isRead).length
  );

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
            items.map((item) => (item.id === notificationId ? updated : item))
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