import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../shared/components/toast/toast';
import { FeedService } from '../../core/services/feed.service';
import { JobService } from '../../core/services/job.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { FeedPostResponse } from '../../core/models/feed.model';
import { JobApplication, JobRecommendationResponse } from '../../core/models/job.model';
import { PostulantProfileResponse } from '../../core/models/profile.model';
import { readApiError } from '../../core/utils/api-error';
import { applicationLabel } from '../../core/utils/labels';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, Toast],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  private feedService = inject(FeedService);
  private jobService = inject(JobService);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Estados Reactivos conectados al Backend
  posts = signal<FeedPostResponse[]>([]);
  recommendations = signal<JobRecommendationResponse[]>([]);
  myApplications = signal<JobApplication[]>([]);
  isLoadingFeed = signal(false);
  isProfileIncomplete = signal(false);

  // Estado inicial limpio (sin datos falsos)
  profile = signal<PostulantProfileResponse>({
    id: '',
    userId: '',
    firstName: '',
    lastName: '',
    studentCode: null,
    career: null,
    currentCycle: null,
    avatarUrl: null,
    bannerUrl: null,
    headline: null,
    bio: null,
    hasUniversityBase: false,
    isInstitutionVerified: false,
    institutionProfile: null,
    institutionName: null,
    institutionLogoUrl: null,
    skills: []
  });

  fullName = computed(() => {
    const first = this.profile().firstName?.trim();
    const last = this.profile().lastName?.trim();
    if (first || last) {
      return `${first} ${last}`.trim();
    }
    return 'Mi Cuenta';
  });

  userInitials = computed(() => {
    const first = this.profile().firstName?.charAt(0) || '';
    const last = this.profile().lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  });

  // Separación clara entre habilidades validadas por institución y habilidades generales
  validatedSkills = computed(() =>
    (this.profile().skills || []).filter((s) => Boolean(s.isValidatedByInstitution))
  );

  unvalidatedSkills = computed(() =>
    (this.profile().skills || []).filter((s) => !s.isValidatedByInstitution)
  );

  // Estado real del trámite académico / convenio
  academicProcedureStatus = computed(() => {
    const p = this.profile();
    if (p.isInstitutionVerified && p.hasUniversityBase) {
      return {
        label: 'Convenio Universitario Activo',
        sublabel: `Acreditado por ${p.institutionName || 'tu institución'}`,
        badge: 'success' as const
      };
    }
    if (p.isInstitutionVerified && !p.hasUniversityBase) {
      return {
        label: 'Egresado Acreditado',
        sublabel: `Verificado por ${p.institutionName || 'tu institución'}`,
        badge: 'success' as const
      };
    }
    if (p.institutionProfile && !p.isInstitutionVerified) {
      return {
        label: 'Trámite de Acreditación',
        sublabel: `En revisión por ${p.institutionName || 'la institución'}`,
        badge: 'warning' as const
      };
    }
    return null;
  });

  // Formulario de Crear Post
  newPostContent = '';
  newPostMediaUrl = '';
  showMediaInput = signal(false);
  isPosting = signal(false);

  // Comentarios y Notificaciones Toast
  openComments = signal<Record<string, boolean>>({});
  commentDrafts: Record<string, string> = {};
  toast = signal<ToastData | null>(null);

  // Modales
  selectedJobForAi = signal<JobRecommendationResponse | null>(null);
  isAnalyzingAi = signal(false);
  showValidationModal = signal(false);

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoadingFeed.set(true);

    // 1. Cargar Feed Global
    this.feedService.getGlobalFeed().subscribe({
      next: (data) => {
        this.posts.set(data);
        this.isLoadingFeed.set(false);
      },
      error: (err) => {
        this.isLoadingFeed.set(false);
        this.showToast(readApiError(err, 'No se pudo cargar el feed de publicaciones.'), 'error');
      }
    });

    // 2. Cargar Perfil según el Rol del usuario autenticado
    const role = this.authService.getStoredRole();
    if (role === 'POSTULANT') {
      this.profileService.getMyPostulantProfile().subscribe({
        next: (data) => {
          this.profile.set(data);
          this.isProfileIncomplete.set(false);
        },
        error: () => {
          this.isProfileIncomplete.set(true);
        }
      });

      // 3. Cargar Recomendaciones Laborales
      this.jobService.getRecommendations().subscribe({
        next: (data) => this.recommendations.set(data),
        error: () => this.recommendations.set([])
      });

      // 4. Cargar Estado de mis Postulaciones a Vacantes (para la Card de Notificaciones Rápidas)
      this.jobService.myApplications().subscribe({
        next: (apps) => this.myApplications.set(apps.slice(0, 3)),
        error: () => this.myApplications.set([])
      });
    } else if (role === 'RECRUITER') {
      this.profileService.getMyRecruiterProfile().subscribe({
        next: (data) => {
          this.profile.set({
            id: data.id || '',
            userId: data.userId || '',
            firstName: data.companyName || 'Empresa',
            lastName: '',
            avatarUrl: data.logoUrl || null,
            headline: data.industry ? `${data.industry} · Cuenta Reclutador` : 'Empresa Reclutadora',
            isInstitutionVerified: Boolean(data.isValidated || data.isVerified),
            institutionName: 'Cuenta Corporativa',
            skills: []
          });
        },
        error: () => this.isProfileIncomplete.set(true)
      });
    } else if (role === 'INSTITUTION') {
      this.profileService.getMyInstitutionProfile().subscribe({
        next: (data) => {
          this.profile.set({
            id: data.id || '',
            userId: data.userId || '',
            firstName: data.name || 'Institución',
            lastName: '',
            avatarUrl: data.logoUrl || null,
            headline: data.domain ? `Dominio oficial: ${data.domain}` : 'Institución Educativa',
            isInstitutionVerified: Boolean(data.isVerified),
            institutionName: 'Institución Oficial',
            skills: []
          });
        },
        error: () => this.isProfileIncomplete.set(true)
      });
    }
  }

  handleCreatePost(): void {
    const content = this.newPostContent.trim();
    if (!content) {
      this.showToast('Por favor escribe algún contenido para tu publicación.', 'warning');
      return;
    }

    this.isPosting.set(true);
    const media = this.newPostMediaUrl.trim() ? [this.newPostMediaUrl.trim()] : undefined;

    this.feedService.createPost({ content, mediaUrls: media }).subscribe({
      next: (created) => {
        // Si el backend no adjuntó el avatar en la respuesta inmediata, usamos el de nuestro perfil cargado
        const enrichedPost: FeedPostResponse = {
          ...created,
          authorAvatarUrl: created.authorAvatarUrl || this.profile().avatarUrl || undefined,
          authorHeadline: created.authorHeadline || this.profile().headline || ''
        };
        this.posts.update((prev) => [enrichedPost, ...prev]);
        this.newPostContent = '';
        this.newPostMediaUrl = '';
        this.showMediaInput.set(false);
        this.isPosting.set(false);
        this.showToast('¡Publicación compartida en el feed!', 'success');
      },
      error: (err) => {
        this.isPosting.set(false);
        this.showToast(
          readApiError(err, 'Completa tu perfil antes de publicar en el feed.'),
          'error'
        );
      }
    });
  }

  toggleMediaInput(): void {
    this.showMediaInput.update((v) => !v);
  }

  handleToggleLike(post: FeedPostResponse): void {
    this.feedService.toggleLike(post.id).subscribe({
      next: (updatedPost) => {
        this.posts.update((items) =>
          items.map((p) =>
            p.id === post.id
              ? { ...p, likesCount: updatedPost.likesCount, likedByMe: updatedPost.likedByMe }
              : p
          )
        );
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo procesar tu reacción.'), 'error');
      }
    });
  }

  toggleCommentsSection(postId: string): void {
    const willOpen = !this.openComments()[postId];
    this.openComments.update((map) => ({
      ...map,
      [postId]: willOpen
    }));

    if (willOpen) {
      this.feedService.getCommentsByPost(postId).subscribe({
        next: (comments) => {
          this.posts.update((items) =>
            items.map((p) =>
              p.id === postId ? { ...p, comments, commentsCount: comments.length } : p
            )
          );
        }
      });
    }
  }

  isCommentsOpen(postId: string): boolean {
    return !!this.openComments()[postId];
  }

  handleAddComment(postId: string): void {
    const text = (this.commentDrafts[postId] || '').trim();
    if (!text) return;

    this.feedService.addComment(postId, text).subscribe({
      next: (comment) => {
        const enrichedComment = {
          ...comment,
          authorAvatarUrl: comment.authorAvatarUrl || this.profile().avatarUrl || undefined,
          authorHeadline: comment.authorHeadline || this.profile().headline || undefined
        };
        this.posts.update((items) =>
          items.map((p) => {
            if (p.id === postId) {
              const currentComments = p.comments || [];
              return {
                ...p,
                comments: [...currentComments, enrichedComment],
                commentsCount: currentComments.length + 1
              };
            }
            return p;
          })
        );
        this.commentDrafts[postId] = '';
        this.showToast('Comentario publicado.', 'success');
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo publicar el comentario.'), 'error');
      }
    });
  }

  handleDeletePost(postId: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta publicación?')) {
      this.feedService.deletePost(postId).subscribe({
        next: () => {
          this.posts.update((items) => items.filter((p) => p.id !== postId));
          this.showToast('Publicación eliminada correctamente.', 'info');
        },
        error: (err) => {
          this.showToast(
            readApiError(err, 'No tienes permiso para eliminar esta publicación.'),
            'error'
          );
        }
      });
    }
  }

  handleApplyJob(job: JobRecommendationResponse): void {
    if (job.isApplied) return;

    this.jobService.applyToJob(job.id).subscribe({
      next: () => {
        this.recommendations.update((items) =>
          items.map((j) => (j.id === job.id ? { ...j, isApplied: true } : j))
        );
        // Actualizamos también la lista de postulaciones rápidas en la Card 3
        this.jobService.myApplications().subscribe({
          next: (apps) => this.myApplications.set(apps.slice(0, 3))
        });
        this.showToast(`¡Postulación enviada a ${job.companyName}!`, 'success');
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo enviar la postulación.'), 'error');
      }
    });
  }

  handleDismissJob(jobId: string, event: Event): void {
    event.stopPropagation();
    this.jobService.dismissRecommendation(jobId).subscribe({
      next: () => {
        this.recommendations.update((items) => items.filter((j) => j.id !== jobId));
        this.showToast('Recomendación descartada.', 'info');
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo descartar la vacante.'), 'error');
      }
    });
  }

  applicationStatusLabel(status: string): string {
    return applicationLabel(status);
  }

  openAiAnalysis(job: JobRecommendationResponse | undefined): void {
    if (!job) {
      this.showToast('No hay vacantes recomendadas disponibles para analizar.', 'info');
      return;
    }
    this.selectedJobForAi.set(job);
    this.isAnalyzingAi.set(true);
    setTimeout(() => {
      this.isAnalyzingAi.set(false);
    }, 400);
  }

  closeAiModal(): void {
    this.selectedJobForAi.set(null);
  }

  openValidationModal(): void {
    this.showValidationModal.set(true);
  }

  closeValidationModal(): void {
    this.showValidationModal.set(false);
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'Reciente';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return 'Reciente';
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  }
}