import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { InstitutionProfileResponse } from '../../../core/models/profile.model';
import { FeedPostResponse } from '../../../core/models/feed.model';
import { readApiError } from '../../../core/utils/api-error';
import { toDate } from '../../../core/utils/format';

@Component({
  selector: 'app-public-inst-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Toast, AlertModal],
  templateUrl: './public-inst-profile.html'
})
export class PublicInstProfile implements OnInit {
  private route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private profileService = inject(ProfileService);
  private feedService = inject(FeedService);
  private connectionService = inject(ConnectionService);
  private authService = inject(AuthService);
  readonly directoryService = inject(DirectoryService);

  isLoading = signal(true);
  isActionLoading = signal(false);
  isFollowing = signal(false);

  postsTab = signal<'IMPORTANT' | 'NORMAL'>('IMPORTANT');

  connectionState = signal<ConnectionStatusResponse>({
    targetUserId: '',
    status: 'NONE',
    canConnect: true,
    restrictionReason: null
  });

  isRestrictionModalOpen = signal(false);
  restrictionModalMessage = signal('');
  toast = signal<ToastData | null>(null);

  allInstitutionPosts = signal<FeedPostResponse[]>([]);

  profile = signal<InstitutionProfileResponse>({
    id: '',
    userId: '',
    name: '',
    domain: '',
    logoUrl: null,
    bannerUrl: null,
    bannerText: null,
    description: null,
    isVerified: true
  });

  importantPosts = computed(() =>
    this.allInstitutionPosts().filter((p) => Boolean(p.isImportant))
  );

  normalPosts = computed(() =>
    this.allInstitutionPosts().filter((p) => !p.isImportant)
  );

  institutionInitials = computed(() => {
    const name = this.profile().name?.trim() || 'Institución';
    return (
      name
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || 'UNI'
    );
  });

  safeDomain = computed(() => {
    const d = this.profile().domain?.trim();
    return d ? (d.startsWith('http') ? d : `www.${d}`) : 'portal.edu.pe';
  });

  safeBannerTitle = computed(() => {
    const custom = this.profile().bannerText?.trim();
    const fallback = this.profile().name?.trim() || 'Institución Educativa';
    const text = custom || fallback;
    return text.length > 35 ? text.slice(0, 35) + '…' : text;
  });

  safeBannerSubtitle = computed(() => {
    const d = this.profile().domain?.trim();
    return d
      ? `Institución Educativa Oficial · Dominio @${d}`
      : 'Casa de estudios acreditada en Unext';
  });

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
      const idParam = params.get('id') || '';
      if (!idParam) {
        this.router.navigate(['/feed']);
        return;
      }
      this.loadPublicInstitution(idParam);
    });
  }

  private loadPublicInstitution(institutionId: string): void {
    this.isLoading.set(true);
    this.profileService.getInstitutionPublicProfile(institutionId).subscribe({
      next: (data: InstitutionProfileResponse) => {
        if (data.userId && data.userId === this.authService.session()?.userId) {
          this.router.navigate(['/profile/me']);
          return;
        }
        this.profile.set(data);
        this.isLoading.set(false);

        if (data.userId) {
          this.feedService.getPostsByUser(data.userId).subscribe({
            next: (posts) => this.allInstitutionPosts.set(posts),
            error: () => this.allInstitutionPosts.set([])
          });

          this.connectionService.getStatusWithUser(data.userId).subscribe({
            next: (state) => this.connectionState.set(state),
            error: () => {}
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showToast(readApiError(err, 'No se encontró el perfil institucional.'), 'error');
      }
    });
  }

  handleConnectClick(): void {
    const state = this.connectionState();
    const targetUserId = this.profile().userId;
    if (!targetUserId) return;

    if (!state.canConnect) {
      this.restrictionModalMessage.set(
        state.restrictionReason ||
          'Solo puedes conectar con una institución educativa una vez que haya validado tu vínculo académico.'
      );
      this.isRestrictionModalOpen.set(true);
      return;
    }

    this.isActionLoading.set(true);
    this.connectionService.sendRequest(targetUserId).subscribe({
      next: (updated) => {
        this.isActionLoading.set(false);
        this.connectionState.set(updated);
        this.showToast(`Solicitud enviada a ${this.profile().name}.`, 'success');
      },
      error: (err) => {
        this.isActionLoading.set(false);
        this.restrictionModalMessage.set(
          readApiError(err, 'No se pudo enviar la solicitud de conexión.')
        );
        this.isRestrictionModalOpen.set(true);
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

  handleToggleFollow(): void {
    const targetUserId = this.profile().userId;
    if (!targetUserId) return;

    this.connectionService.toggleFollow(targetUserId).subscribe({
      next: (res) => {
        this.isFollowing.set(res.following);
        this.showToast(
          res.following
            ? `Ahora sigues los comunicados de ${this.profile().name}.`
            : `Dejaste de seguir a ${this.profile().name}.`,
          'info'
        );
      }
    });
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