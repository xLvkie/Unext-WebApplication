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
import { RecruiterProfileResponse } from '../../../core/models/profile.model';
import { FeedPostResponse } from '../../../core/models/feed.model';
import { JobOffer } from '../../../core/models/job.model';
import { readApiError } from '../../../core/utils/api-error';
import { toDate } from '../../../core/utils/format';

@Component({
  selector: 'app-public-rec-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Toast, AlertModal],
  templateUrl: './public-rec-profile.html'
})
export class PublicRecProfile implements OnInit {
  private route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private profileService = inject(ProfileService);
  private feedService = inject(FeedService);
  private connectionService = inject(ConnectionService);
  private authService = inject(AuthService);
  readonly directoryService = inject(DirectoryService);

  readonly MAX_IMPORTANT_POSTS = 5;

  isLoading = signal(true);
  isActionLoading = signal(false);
  isFollowing = signal(false);

  // Pestaña activa en la Card 4: Publicaciones Importantes vs Publicaciones Normales
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

  allCompanyPosts = signal<FeedPostResponse[]>([]);
  companyJobs = signal<JobOffer[]>([]);

  profile = signal<RecruiterProfileResponse>({
    id: '',
    userId: '',
    companyName: '',
    ruc: '',
    industry: '',
    headline: '',
    websiteUrl: '',
    description: '',
    companyLogoUrl: null,
    bannerUrl: null,
    bannerText: null,
    isValidated: false,
    isVerified: true
  });

  importantPosts = computed(() =>
    this.allCompanyPosts().filter((p) => Boolean(p.isImportant))
  );

  normalPosts = computed(() =>
    this.allCompanyPosts().filter((p) => !p.isImportant)
  );

  companyInitials = computed(() => {
    const name = this.profile().companyName?.trim() || 'Empresa';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || 'EM'
    );
  });

  safeBannerTitle = computed(() => {
    const custom = this.profile().bannerText?.trim();
    const fallback = this.profile().companyName?.trim() || 'Organización Corporativa';
    const text = custom || fallback;
    return text.length > 35 ? text.slice(0, 35) + '…' : text;
  });

  safeBannerSubtitle = computed(() => {
    const h =
      this.profile().headline?.trim() ||
      (this.profile().industry
        ? `${this.profile().industry} · RUC ${this.profile().ruc}`
        : 'Empresa verificada en Unext');
    return h.length > 65 ? h.slice(0, 65) + '…' : h;
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
      this.loadPublicRecruiter(idParam);
    });
  }

  private loadPublicRecruiter(recruiterId: string): void {
    this.isLoading.set(true);
    this.profileService.getRecruiterPublicProfile(recruiterId).subscribe({
      next: (data: RecruiterProfileResponse) => {
        if (data.userId && data.userId === this.authService.session()?.userId) {
          this.router.navigate(['/profile/me']);
          return;
        }
        this.profile.set(data);
        this.isLoading.set(false);

        if (data.id) {
          this.profileService.getRecruiterPublicJobs(data.id).subscribe({
            next: (jobs) => this.companyJobs.set(jobs),
            error: () => this.companyJobs.set([])
          });
        }

        if (data.userId) {
          this.feedService.getPostsByUser(data.userId).subscribe({
            next: (posts) => this.allCompanyPosts.set(posts),
            error: () => this.allCompanyPosts.set([])
          });

          this.connectionService.getStatusWithUser(data.userId).subscribe({
            next: (state) => this.connectionState.set(state),
            error: () => {}
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showToast(readApiError(err, 'No se encontró el perfil corporativo.'), 'error');
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
          'Para conectar con esta empresa, primero debes haber postulado a una de sus vacantes activas.'
      );
      this.isRestrictionModalOpen.set(true);
      return;
    }

    this.isActionLoading.set(true);
    this.connectionService.sendRequest(targetUserId).subscribe({
      next: (updated) => {
        this.isActionLoading.set(false);
        this.connectionState.set(updated);
        this.showToast(`Solicitud enviada a ${this.profile().companyName}.`, 'success');
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
            ? `Ahora sigues las novedades de ${this.profile().companyName}.`
            : `Dejaste de seguir a ${this.profile().companyName}.`,
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