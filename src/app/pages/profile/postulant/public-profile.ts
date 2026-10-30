import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../../shared/components/toast/toast';
import { AlertModal } from '../../../shared/components/alert-modal/alert-modal';
import { ProfileSidebar } from './components/profile-sidebar/profile-sidebar';
import { ProfileService } from '../../../core/services/profile.service';
import { FeedService } from '../../../core/services/feed.service';
import {
  ConnectionService,
  ConnectionStatusResponse
} from '../../../core/services/connection.service';
import { AuthService } from '../../../core/services/auth.service';
import { DirectoryService } from '../../../core/services/directory.service';
import { PostulantProfileResponse } from '../../../core/models/profile.model';
import { FeedPostResponse } from '../../../core/models/feed.model';
import { readApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Toast, AlertModal, ProfileSidebar],
  templateUrl: './public-profile.html'
})
export class PublicProfile implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private feedService = inject(FeedService);
  private connectionService = inject(ConnectionService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  readonly directoryService = inject(DirectoryService);

  isLoading = signal(true);
  isActionLoading = signal(false);
  viewedRole = signal<'POSTULANT' | 'RECRUITER' | 'INSTITUTION'>('POSTULANT');

  // Estado de conexión con este usuario
  connectionState = signal<ConnectionStatusResponse>({
    targetUserId: '',
    status: 'NONE',
    canConnect: true,
    restrictionReason: null
  });

  // Modal cuando existe restricción (ej. Postulante -> Empresa sin haber postulado)
  isRestrictionModalOpen = signal(false);
  restrictionModalMessage = signal('');

  toast = signal<ToastData | null>(null);
  importantPosts = signal<FeedPostResponse[]>([]);

  profile = signal<PostulantProfileResponse>({
    id: '',
    userId: '',
    firstName: '',
    lastName: '',
    skills: []
  });

  fullName = computed(() => {
    const f = this.profile().firstName?.trim();
    const l = this.profile().lastName?.trim();
    return f || l ? `${f} ${l}`.trim() : 'Usuario de Unext';
  });

  initials = computed(() => {
    const f = this.profile().firstName?.charAt(0) || '';
    const l = this.profile().lastName?.charAt(0) || '';
    return (f + l).toUpperCase() || 'U';
  });

  institutionInitials = computed(() => {
    const name = this.profile().institutionName || 'Universidad';
    return (
      name
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3)
        .map((w) => w[0].toUpperCase())
        .join('') || 'UNI'
    );
  });

  safeBannerTitle = computed(() => {
    const custom = this.profile().bannerText?.trim();
    const fallback = this.profile().career?.trim() || this.fullName();
    const text = custom || fallback;
    return text.length > 35 ? text.slice(0, 35) + '…' : text;
  });

  safeBannerSubtitle = computed(() => {
    const h = this.profile().headline?.trim() || 'Talento profesional en Unext';
    return h.length > 65 ? h.slice(0, 65) + '…' : h;
  });

  topSkills = computed(() =>
    (this.profile().skills || []).filter((s) => Boolean(s.isTopSkill)).slice(0, 3)
  );

  isPdfCv = computed(() => {
    const url = this.profile().cvUrl || '';
    const name = (this.profile().cvFileName || '').toLowerCase();
    return url.startsWith('data:application/pdf') || name.endsWith('.pdf');
  });

  cvSafePreviewUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.profile().cvUrl;
    if (!url || !this.isPdfCv()) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`
    );
  });

  maxImportantForViewedRole = computed(() => {
    const r = this.viewedRole();
    if (r === 'INSTITUTION') return 6;
    if (r === 'RECRUITER') return 5;
    return 3;
  });

  suggestedPeers = computed(() =>
    this.directoryService
      .contacts()
      .filter((c) => c.userId !== this.profile().userId)
      .slice(0, 3)
  );

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.directoryService.load().subscribe();

    this.route.paramMap.subscribe((params) => {
      const roleParam = (params.get('role') || 'postulant').toUpperCase();
      const idParam = params.get('id') || '';

      if (!idParam) {
        this.router.navigate(['/feed']);
        return;
      }

      if (roleParam === 'RECRUITER') {
        this.viewedRole.set('RECRUITER');
      } else if (roleParam === 'INSTITUTION') {
        this.viewedRole.set('INSTITUTION');
      } else {
        this.viewedRole.set('POSTULANT');
      }

      this.loadPublicProfile(idParam);
    });
  }

  private loadPublicProfile(profileId: string): void {
    this.isLoading.set(true);
    const role = this.viewedRole();

    if (role === 'POSTULANT') {
      this.profileService.getPostulantPublicProfile(profileId).subscribe({
        next: (data) => {
          // Si soy yo mismo viendo mi perfil público, redirijo a /profile/me
          if (data.userId && data.userId === this.authService.session()?.userId) {
            this.router.navigate(['/profile/me']);
            return;
          }
          this.profile.set(data);
          this.isLoading.set(false);
          this.loadAuxiliaryData(data.userId);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showToast(readApiError(err, 'No se encontró el perfil solicitado.'), 'error');
        }
      });
    } else if (role === 'RECRUITER') {
      this.profileService.getRecruiterPublicProfile(profileId).subscribe({
        next: (r) => {
          this.profile.set({
            id: r.id,
            userId: r.userId,
            firstName: r.companyName || 'Empresa',
            lastName: '',
            avatarUrl: r.companyLogoUrl || r.logoUrl || null,
            headline: r.industry ? `${r.industry} · RUC ${r.ruc || ''}` : 'Empresa Reclutadora',
            bio: r.description || '',
            isInstitutionVerified: Boolean(r.isValidated),
            institutionName: 'Empresa Verificada',
            skills: []
          });
          this.isLoading.set(false);
          this.loadAuxiliaryData(r.userId);
        },
        error: () => this.isLoading.set(false)
      });
    } else if (role === 'INSTITUTION') {
      this.profileService.getInstitutionPublicProfile(profileId).subscribe({
        next: (i) => {
          this.profile.set({
            id: i.id,
            userId: i.userId,
            firstName: i.name || 'Institución Educativa',
            lastName: '',
            avatarUrl: i.logoUrl || null,
            headline: i.domain ? `Dominio académico oficial: ${i.domain}` : 'Institución Educativa',
            bio: i.description || '',
            isInstitutionVerified: true,
            institutionName: i.name,
            skills: []
          });
          this.isLoading.set(false);
          this.loadAuxiliaryData(i.userId);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  private loadAuxiliaryData(targetUserId: string): void {
    if (!targetUserId) return;

    // 1. Cargar sus Publicaciones Importantes para el Sidebar derecho
    this.feedService.getImportantPostsByUser(targetUserId).subscribe({
      next: (posts) => this.importantPosts.set(posts),
      error: () => this.importantPosts.set([])
    });

    // 2. Consultar el estado de conexión/amistad y si aplica alguna restricción
    this.connectionService.getStatusWithUser(targetUserId).subscribe({
      next: (state) => this.connectionState.set(state),
      error: () => {}
    });
  }

  // Acción principal del botón "+ Conectar"
  handleConnectClick(): void {
    const state = this.connectionState();
    const targetUserId = this.profile().userId;
    if (!targetUserId) return;

    // Si hay una restricción de negocio (ej. Postulante intentando agregar a Empresa sin haber postulado)
    if (!state.canConnect) {
      this.restrictionModalMessage.set(
        state.restrictionReason ||
          'No cumples los requisitos actuales para conectar con este perfil.'
      );
      this.isRestrictionModalOpen.set(true);
      return;
    }

    this.isActionLoading.set(true);
    this.connectionService.sendRequest(targetUserId).subscribe({
      next: (updated) => {
        this.isActionLoading.set(false);
        this.connectionState.set(updated);
        this.showToast(`Solicitud de conexión enviada a ${this.fullName()}.`, 'success');
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = readApiError(err, 'No se pudo enviar la solicitud de conexión.');
        this.restrictionModalMessage.set(msg);
        this.isRestrictionModalOpen.set(true);
      }
    });
  }

  handleAcceptRequest(): void {
    const connId = this.connectionState().connectionId;
    if (!connId) return;

    this.isActionLoading.set(true);
    this.connectionService.acceptRequest(connId).subscribe({
      next: (updated) => {
        this.isActionLoading.set(false);
        this.connectionState.set(updated);
        this.showToast(`¡Ahora estás conectado con ${this.fullName()}!`, 'success');
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.showToast(readApiError(err, 'No se pudo aceptar la solicitud.'), 'error');
      }
    });
  }

  handleCancelOrRemoveConnection(): void {
    const targetUserId = this.profile().userId;
    if (!targetUserId) return;

    this.isActionLoading.set(true);
    this.connectionService.removeConnection(targetUserId).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.connectionState.update((prev) => ({ ...prev, status: 'NONE' }));
        this.showToast('Conexión actualizada.', 'info');
      },
      error: () => this.isActionLoading.set(false)
    });
  }

  downloadCv(): void {
    const url = this.profile().cvUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = this.profile().cvFileName || `CV-${this.fullName()}.pdf`;
    link.click();
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}