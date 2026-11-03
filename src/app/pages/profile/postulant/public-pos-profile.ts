import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../../shared/components/toast/toast';
import { AlertModal } from '../../../shared/components/alert-modal/alert-modal';
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
import { toDate } from '../../../core/utils/format';

@Component({
  selector: 'app-public-pos-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Toast, AlertModal],
  templateUrl: './public-pos-profile.html'
})
export class PublicPosProfile implements OnInit {
  private route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private profileService = inject(ProfileService);
  private feedService = inject(FeedService);
  private connectionService = inject(ConnectionService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  readonly directoryService = inject(DirectoryService);

  isLoading = signal(true);
  isActionLoading = signal(false);
  viewedRole = signal<'POSTULANT' | 'RECRUITER' | 'INSTITUTION'>('POSTULANT');

  // Pestaña activa en la Card 5 de Publicaciones (Importantes vs Recientes)
  postsTab = signal<'IMPORTANT' | 'NORMAL'>('IMPORTANT');
  allUserPosts = signal<FeedPostResponse[]>([]);

  importantPosts = computed(() =>
    this.allUserPosts().filter((p) => Boolean(p.isImportant))
  );

  normalPosts = computed(() =>
    this.allUserPosts().filter((p) => !p.isImportant)
  );

  connectionState = signal<ConnectionStatusResponse>({
    targetUserId: '',
    status: 'NONE',
    canConnect: true,
    restrictionReason: null
  });

  isRestrictionModalOpen = signal(false);
  restrictionModalMessage = signal('');

  toast = signal<ToastData | null>(null);

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

  // Límite de 6 usuarios de la comunidad que se actualizan cada día
  suggestedPeers = computed(() =>
    this.directoryService.dailyCommunityPeers(this.profile().userId, 6)
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
            avatarUrl: r.companyLogoUrl || null,
            headline: r.industry ? `${r.industry} · RUC ${r.ruc || ''}` : 'Empresa Reclutadora',
            bio: r.description || '',
            isInstitutionVerified: Boolean(r.isValidated || r.isVerified),
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

    this.feedService.getPostsByUser(targetUserId).subscribe({
      next: (posts) => this.allUserPosts.set(posts),
      error: () => this.allUserPosts.set([])
    });

    this.connectionService.getStatusWithUser(targetUserId).subscribe({
      next: (state) => this.connectionState.set(state),
      error: () => {}
    });
  }

  handleConnectClick(): void {
    const state = this.connectionState();
    const targetUserId = this.profile().userId;
    if (!targetUserId) return;

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

  isVideo(url: string): boolean {
    return url.startsWith('data:video/') || /\.(mp4|webm|ogg)$/i.test(url);
  }

  formatPostDate(value: unknown): string {
    const d = toDate(value);
    if (!d) return 'Reciente';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatExpirationRemaining(expiresAt: unknown): string {
    const exp = toDate(expiresAt);
    if (!exp) return 'Publicación temporal';
    const diffMs = exp.getTime() - Date.now();
    if (diffMs <= 0) return 'Por expirar';
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} d restantes`;
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}