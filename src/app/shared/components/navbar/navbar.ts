import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserRole } from '../../../core/models/auth.model';

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: 'home' | 'network' | 'jobs' | 'messages' | 'notifications' | 'agreements' | 'dashboard';
  roles?: UserRole[]; // Si no se especifica, aparece para los 3 segmentos
  badgeCount?: number;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html'
})
export class Navbar implements OnInit {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Inputs opcionales: si una página (como Profile) quiere pasarlos en vivo, tienen prioridad;
  // si solo pones <app-navbar />, el componente usa los datos que carga automáticamente en ngOnInit.
  unreadNotifications = input<number | null>(null);
  unreadMessages = input<number>(0);
  userName = input<string>('');
  userSubtitle = input<string>('');
  userAvatarUrl = input<string | null>(null);

  searchChange = output<string>();

  // Estado interno cargado automáticamente desde el backend según el segmento
  private fetchedName = signal<string>('Mi Cuenta');
  private fetchedSubtitle = signal<string>('Ver perfil');
  private fetchedAvatar = signal<string | null>(null);

  searchQuery = '';
  isProfileMenuOpen = signal(false);
  isMobileMenuOpen = signal(false);

  currentRole = this.authService.currentUserRole;
  isLoggedIn = computed(() => !!this.authService.getToken());

  // Computados finales que combinan inputs opcionales con la carga automática
  displayName = computed(() => {
    const custom = this.userName()?.trim();
    return custom ? custom : this.fetchedName();
  });

  displaySubtitle = computed(() => {
    const custom = this.userSubtitle()?.trim();
    return custom ? custom : this.fetchedSubtitle();
  });

  displayAvatar = computed(() => this.userAvatarUrl() || this.fetchedAvatar());

  displayUnreadNotifications = computed(() => {
    const manual = this.unreadNotifications();
    return manual !== null ? manual : this.notificationService.unreadCount();
  });

  userInitials = computed(() => {
    const parts = this.displayName().trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'U';
  });

  // Configuración centralizada de opciones para los 3 segmentos
  private readonly allNavItems: NavItem[] = [
    {
      id: 'feed',
      label: 'Inicio',
      route: '/feed',
      icon: 'home'
    },
    {
      id: 'directory',
      label: 'Mi red',
      route: '/directory',
      icon: 'network'
    },
    {
      id: 'jobs-postulant',
      label: 'Buscar trabajo',
      route: '/jobs',
      icon: 'jobs',
      roles: ['POSTULANT']
    },
    {
      id: 'jobs-recruiter',
      label: 'Mis vacantes',
      route: '/recruiter/jobs',
      icon: 'jobs',
      roles: ['RECRUITER']
    },
    {
      id: 'agreements',
      label: 'Convenios',
      route: '/agreements',
      icon: 'agreements',
      roles: ['RECRUITER', 'INSTITUTION']
    },
    {
      id: 'institution-dashboard',
      label: 'Acreditaciones',
      route: '/institution/validations',
      icon: 'dashboard',
      roles: ['INSTITUTION']
    },
    {
      id: 'messages',
      label: 'Mensajería',
      route: '/messages',
      icon: 'messages'
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      route: '/notifications',
      icon: 'notifications'
    }
  ];

  visibleNavItems = computed(() => {
    const role = this.currentRole() || 'POSTULANT';
    return this.allNavItems.filter(
      (item) => !item.roles || item.roles.includes(role)
    );
  });

  roleBadgeLabel = computed(() => {
    switch (this.currentRole()) {
      case 'RECRUITER':
        return 'Empresa';
      case 'INSTITUTION':
        return 'Institución';
      default:
        return 'Postulante';
    }
  });

  ngOnInit(): void {
    if (!this.isLoggedIn()) return;

    // 1. Cargar contador de notificaciones automáticamente si aún no está en memoria
    if (this.notificationService.notifications().length === 0) {
      this.notificationService.getMyNotifications().subscribe({ error: () => {} });
    }

    // 2. Cargar nombre, subtítulo/headline y logo/avatar automáticamente según los 3 segmentos
    const role = this.currentRole() || 'POSTULANT';

    if (role === 'POSTULANT') {
      this.profileService.getMyPostulantProfile().subscribe({
        next: (p) => {
          const full = `${p.firstName || ''} ${p.lastName || ''}`.trim();
          if (full) this.fetchedName.set(full);
          this.fetchedSubtitle.set(p.headline || (p.career ? `Estudiante de ${p.career}` : 'Ver perfil'));
          if (p.avatarUrl) this.fetchedAvatar.set(p.avatarUrl);
        },
        error: () => {}
      });
    } else if (role === 'RECRUITER') {
      this.profileService.getMyRecruiterProfile().subscribe({
        next: (r) => {
          if (r.companyName) this.fetchedName.set(r.companyName);
          this.fetchedSubtitle.set(r.industry || 'Cuenta Corporativa');
          if (r.companyLogoUrl || r.logoUrl) {
            this.fetchedAvatar.set(r.companyLogoUrl || r.logoUrl);
          }
        },
        error: () => {}
      });
    } else if (role === 'INSTITUTION') {
      this.profileService.getMyInstitutionProfile().subscribe({
        next: (i) => {
          if (i.name) this.fetchedName.set(i.name);
          this.fetchedSubtitle.set(i.domain ? `Dominio: ${i.domain}` : 'Institución Oficial');
          if (i.logoUrl) this.fetchedAvatar.set(i.logoUrl);
        },
        error: () => {}
      });
    }
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    this.searchChange.emit(q);
    if (q) {
      this.router.navigate(['/directory'], { queryParams: { search: q } });
    }
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((v) => !v);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.isProfileMenuOpen.set(false);
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}