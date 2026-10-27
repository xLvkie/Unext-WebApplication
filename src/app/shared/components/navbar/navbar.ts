import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/auth.model';

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: 'home' | 'network' | 'jobs' | 'messages' | 'notifications' | 'agreements' | 'dashboard';
  roles?: UserRole[]; // Para todos los roles
  badgeCount?: number;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html'
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Inputs opcionales para pasar contadores reales desde el servicio de notificaciones/mensajes
  unreadNotifications = input<number>(0);
  unreadMessages = input<number>(0);
  userName = input<string>('Mi Cuenta');
  userSubtitle = input<string>('Ver perfil');
  userAvatarUrl = input<string | null>(null);

  // Evento por si una página quiere escuchar lo que el usuario escribe en el buscador superior
  searchChange = output<string>();

  searchQuery = '';
  isProfileMenuOpen = signal(false);
  isMobileMenuOpen = signal(false);

  currentRole = this.authService.currentUserRole;
  isLoggedIn = computed(() => !!this.authService.getToken());

  // Configuración escalable: Aquí agregamos o editamos botones para cualquier segmento en un solo lugar
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

  // Filtra automáticamente los botones según el rol del usuario logueado
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