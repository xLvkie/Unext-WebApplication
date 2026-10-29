import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../shared/components/toast/toast';
import { NotificationService } from '../../core/services/notification.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationCategory, NotificationItem } from '../../core/models/notification.model';
import { PostulantProfileResponse } from '../../core/models/profile.model';
import { readApiError } from '../../core/utils/api-error';
import { toDate } from '../../core/utils/format';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Toast],
  templateUrl: './notifications.html'
})
export class Notifications implements OnInit {
  readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = signal(true);
  selectedCategory = signal<NotificationCategory>('ALL');
  toast = signal<ToastData | null>(null);

  filteredNotifications = computed(() => {
    const all = this.notificationService.notifications();
    const cat = this.selectedCategory();

    if (cat === 'ALL') return all;
    if (cat === 'UNREAD') return all.filter((n) => !n.isRead);
    return all.filter((n) => this.resolveKind(n) === cat);
  });

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading.set(true);
    this.notificationService.getMyNotifications().subscribe({
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.isLoading.set(false);
        this.showToast(readApiError(err, 'No se pudieron cargar las notificaciones.'), 'error');
      }
    });
  }

  selectCategory(category: NotificationCategory): void {
    this.selectedCategory.set(category);
  }

  handleMarkAsRead(item: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    if (item.isRead) return;

    this.notificationService.markAsRead(item.id).subscribe({
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo actualizar la notificación.'), 'error');
      }
    });
  }

  handleMarkAllAsRead(): void {
    if (this.notificationService.unreadCount() === 0) return;

    this.notificationService.markAllAsRead().subscribe({
      next: () => this.showToast('Todas las notificaciones fueron marcadas como leídas.', 'success'),
      error: (err) => this.showToast(readApiError(err, 'No se pudo completar la acción.'), 'error')
    });
  }

  handleDelete(item: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(item.id).subscribe({
      next: () => this.showToast('Notificación eliminada.', 'info'),
      error: (err) => this.showToast(readApiError(err, 'No se pudo eliminar la notificación.'), 'error')
    });
  }

  handleNotificationClick(item: NotificationItem): void {
    if (!item.isRead) {
      this.handleMarkAsRead(item);
    }
    const route = this.resolveTargetRoute(item);
    this.router.navigate([route]);
  }

  // Clasifica automáticamente la notificación según el título o contenido generado en el backend
  resolveKind(item: NotificationItem): 'JOBS' | 'ACADEMIC' | 'FEED' {
    const text = `${item.title} ${item.content}`.toLowerCase();
    if (
      text.includes('vacante') ||
      text.includes('postulaci') ||
      text.includes('empleo') ||
      text.includes('reclutador') ||
      text.includes('oferta')
    ) {
      return 'JOBS';
    }
    if (
      text.includes('validaci') ||
      text.includes('académic') ||
      text.includes('academic') ||
      text.includes('habilidad') ||
      text.includes('instituci') ||
      text.includes('convenio')
    ) {
      return 'ACADEMIC';
    }
    return 'FEED';
  }

  resolveTargetRoute(item: NotificationItem): string {
    const kind = this.resolveKind(item);
    if (kind === 'JOBS') return '/jobs';
    if (kind === 'ACADEMIC') return '/profile/me';
    return '/feed';
  }

  formatRelativeTime(value: unknown): string {
    const date = toDate(value);
    if (!date) return 'Reciente';
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `Hace ${diffDays} d`;
    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}