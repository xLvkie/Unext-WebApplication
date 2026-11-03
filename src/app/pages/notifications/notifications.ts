import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../shared/components/toast/toast';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationCategory, NotificationItem } from '../../core/models/notification.model';
import { readApiError } from '../../core/utils/api-error';
import { toDate } from '../../core/utils/format';

export interface QuickLinkItem {
  label: string;
  route: string;
  queryParams?: Record<string, string>;
}

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

  currentRole = computed(() => this.authService.getStoredRole() || 'POSTULANT');

  roleDescription = computed(() => {
    switch (this.currentRole()) {
      case 'RECRUITER':
        return 'Revisa postulaciones recibidas en tus vacantes, estado de convenios e interacciones en la red.';
      case 'INSTITUTION':
        return 'Supervisa solicitudes de acreditación estudiantil, validación de habilidades y convenios de prácticas.';
      default:
        return 'Revisa el estado de tus postulaciones, validaciones académicas e interacciones en la comunidad.';
    }
  });

  jobsFilterLabel = computed(() => {
    switch (this.currentRole()) {
      case 'RECRUITER':
        return 'Administración de mis Vacantes';
      case 'INSTITUTION':
        return 'Empleabilidad e Insignias';
      default:
        return 'Empleos y Postulaciones';
    }
  });

  academicFilterLabel = computed(() => {
    switch (this.currentRole()) {
      case 'RECRUITER':
        return 'Gestión de Convenios';
      case 'INSTITUTION':
        return 'Gestión Académica y Convenios';
      default:
        return 'Validación Académica';
    }
  });

  quickLinks = computed<QuickLinkItem[]>(() => {
    switch (this.currentRole()) {
      case 'RECRUITER':
        return [
          { label: 'Administración de mis vacantes', route: '/recruiter/jobs' },
          {
            label: 'Manejo de convenios universitarios',
            route: '/recruiter/jobs',
            queryParams: { tab: 'agreements' }
          },
          { label: 'Perfil corporativo de empresa', route: '/profile/me' }
        ];
      case 'INSTITUTION':
        return [
          { label: 'Centro de Gestión Académica', route: '/institution/services' },
          { label: 'Explorar conexiones en Mi Red', route: '/directory' },
          { label: 'Perfil institucional', route: '/profile/me' }
        ];
      default:
        return [
          { label: 'Mis postulaciones y empleos', route: '/jobs' },
          { label: 'Acreditación y habilidades', route: '/profile/me' },
          { label: 'Explorar conexiones en Mi Red', route: '/directory' }
        ];
    }
  });

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
      next: () =>
        this.showToast('Todas las notificaciones fueron marcadas como leídas.', 'success'),
      error: (err) =>
        this.showToast(readApiError(err, 'No se pudo completar la acción.'), 'error')
    });
  }

  handleDelete(item: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(item.id).subscribe({
      next: () => this.showToast('Notificación eliminada.', 'info'),
      error: (err) =>
        this.showToast(readApiError(err, 'No se pudo eliminar la notificación.'), 'error')
    });
  }

  handleNotificationClick(item: NotificationItem): void {
    if (!item.isRead) {
      this.handleMarkAsRead(item);
    }
    const target = this.resolveTargetDestination(item);
    if (target.queryParams) {
      this.router.navigate([target.route], { queryParams: target.queryParams });
    } else {
      this.router.navigate([target.route]);
    }
  }

  resolveKind(item: NotificationItem): 'JOBS' | 'ACADEMIC' | 'FEED' {
    const text = `${item.title} ${item.content}`.toLowerCase();
    if (
      text.includes('vacante') ||
      text.includes('postulaci') ||
      text.includes('empleo') ||
      text.includes('candidato') ||
      text.includes('oferta') ||
      text.includes('proceso') ||
      text.includes('seleccionado') ||
      text.includes('aceptado')
    ) {
      return 'JOBS';
    }
    if (
      text.includes('validaci') ||
      text.includes('académic') ||
      text.includes('academic') ||
      text.includes('habilidad') ||
      text.includes('instituci') ||
      text.includes('convenio') ||
      text.includes('práctica') ||
      text.includes('insignia') ||
      text.includes('código') ||
      text.includes('otp') ||
      text.includes('oficializado')
    ) {
      return 'ACADEMIC';
    }
    return 'FEED';
  }

  // Redirección exacta según el contenido de la notificación y el rol (POSTULANT, RECRUITER, INSTITUTION)
  resolveTargetDestination(item: NotificationItem): {
    route: string;
    queryParams?: Record<string, string>;
  } {
    const text = `${item.title} ${item.content}`.toLowerCase();
    const role = this.currentRole();

    // 1. Códigos de seguridad OTP o insignias de perfil -> Perfil propio
    if (text.includes('código') || text.includes('otp') || text.includes('insignia')) {
      return { route: '/profile/me' };
    }

    // 2. Mensajería o chat habilitado
    if (text.includes('mensajería') || text.includes('mensaje')) {
      return { route: '/messages' };
    }

    // 3. Solicitudes de conexión en Mi Red
    if (
      text.includes('conexión') ||
      text.includes('conectar') ||
      text.includes('solicitud para conectar')
    ) {
      return { route: '/directory' };
    }

    // 4. Convenios de prácticas
    if (text.includes('convenio') || text.includes('práctica')) {
      if (role === 'RECRUITER') {
        return { route: '/recruiter/jobs', queryParams: { tab: 'agreements' } };
      }
      if (role === 'INSTITUTION') {
        return { route: '/institution/services' };
      }
      return { route: '/profile/me' };
    }

    // 5. Según categoría general (JOBS / ACADEMIC / FEED)
    const kind = this.resolveKind(item);
    if (kind === 'JOBS') {
      if (role === 'RECRUITER') return { route: '/recruiter/jobs' };
      if (role === 'INSTITUTION') return { route: '/institution/services' };
      return { route: '/jobs' };
    }

    if (kind === 'ACADEMIC') {
      if (role === 'INSTITUTION') return { route: '/institution/services' };
      if (role === 'RECRUITER') {
        return { route: '/recruiter/jobs', queryParams: { tab: 'agreements' } };
      }
      return { route: '/profile/me' };
    }

    return { route: '/feed' };
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