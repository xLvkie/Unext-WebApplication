import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { FeedService } from '../../core/services/feed.service';
import { JobService } from '../../core/services/job.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { FeedPostResponse } from '../../core/models/feed.model';
import { JobRecommendationResponse } from '../../core/models/job.model';
import { PostulantProfileResponse } from '../../core/models/profile.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  private feedService = inject(FeedService);
  private jobService = inject(JobService);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);

  // Estados Reactivos Principales vinculados a la Base de Datos
  posts = signal<FeedPostResponse[]>([]);
  recommendations = signal<JobRecommendationResponse[]>([]);
  profile = signal<PostulantProfileResponse>({
    id: 'prof-101',
    userId: 'usr-me',
    firstName: 'Alejandro',
    lastName: 'Morales',
    studentCode: 'u202012345',
    career: 'Ingeniería de Software',
    currentCycle: 8,
    headline: 'Estudiante de Ing. de Software · 8vo Ciclo | UPC',
    bio: 'Apasionado por el desarrollo web frontend y arquitecturas de microservicios.',
    hasUniversityBase: true,
    isInstitutionVerified: true,
    institutionProfile: 'Universidad Peruana de Ciencias Aplicadas (UPC)',
    skills: [
      { id: 'sk-1', name: 'Angular 17+', masteryLevel: 'AVANZADO', isValidatedByInstitution: true }
    ]
  });

  fullName = computed(() => `${this.profile().firstName} ${this.profile().lastName}`);

  // Formulario de Crear Post (campos existentes en FeedPostRequestDTO)
  newPostContent = '';
  newPostMediaUrl = '';
  showMediaInput = signal(false);
  isPosting = signal(false);

  // Comentarios y Notificaciones en UI
  openComments = signal<Record<string, boolean>>({});
  commentDrafts: Record<string, string> = {};
  toast = signal<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  // Modal de IA Matching
  selectedJobForAi = signal<JobRecommendationResponse | null>(null);
  isAnalyzingAi = signal(false);

  // Modal de Validación Institucional
  showValidationModal = signal(false);

  ngOnInit(): void {
    // Si no hay sesión previa, iniciamos una de demostración para que el navbar y funcionalidades se aprecien completas
    if (!this.authService.getToken()) {
      localStorage.setItem('unext_token', 'demo-session-token');
      localStorage.setItem('unext_role', 'POSTULANT');
      this.authService.currentUserRole.set('POSTULANT');
    }

    this.loadInitialData();
  }

  loadInitialData(): void {
    this.feedService.getGlobalFeed().subscribe({
      next: (data) => this.posts.set(data),
      error: () => {}
    });

    this.jobService.getRecommendations().subscribe({
      next: (data) => this.recommendations.set(data),
      error: () => {}
    });

    this.profileService.getMyProfile().subscribe({
      next: (data) => this.profile.set(data),
      error: () => {}
    });
  }

  // Acciones de Publicar Post (content y mediaUrls de FeedPostRequestDTO)
  handleCreatePost(): void {
    const content = this.newPostContent.trim();
    if (!content) {
      this.showToast('Por favor escribe algún contenido para tu publicación.', 'warning');
      return;
    }

    this.isPosting.set(true);

    const media = this.newPostMediaUrl.trim() ? [this.newPostMediaUrl.trim()] : undefined;

    this.feedService.createPost({
      content,
      mediaUrls: media
    }).subscribe({
      next: (created) => {
        this.posts.update((prev) => {
          if (prev.some((p) => p.id === created.id)) return prev;
          return [created, ...prev];
        });
        this.newPostContent = '';
        this.newPostMediaUrl = '';
        this.showMediaInput.set(false);
        this.isPosting.set(false);
        this.showToast('¡Tu publicación ha sido compartida exitosamente en el feed!', 'success');
      },
      error: () => {
        this.isPosting.set(false);
        this.showToast('Hubo un inconveniente al publicar. Inténtalo nuevamente.', 'error');
      }
    });
  }

  toggleMediaInput(): void {
    this.showMediaInput.update((v) => !v);
  }

  setSampleImage(url: string): void {
    this.newPostMediaUrl = url;
  }

  // Acciones en Publicaciones
  handleToggleLike(post: FeedPostResponse): void {
    this.feedService.toggleLike(post.id).subscribe({
      next: (res) => {
        this.posts.update((items) =>
          items.map((p) =>
            p.id === post.id
              ? { ...p, likesCount: res.likesCount, likedByMe: res.likedByMe }
              : p
          )
        );
      }
    });
  }

  toggleCommentsSection(postId: string): void {
    this.openComments.update((map) => ({
      ...map,
      [postId]: !map[postId]
    }));
  }

  isCommentsOpen(postId: string): boolean {
    return !!this.openComments()[postId];
  }

  handleAddComment(postId: string): void {
    const text = (this.commentDrafts[postId] || '').trim();
    if (!text) return;

    this.feedService.addComment(postId, text).subscribe({
      next: (comment) => {
        this.posts.update((items) =>
          items.map((p) => {
            if (p.id === postId) {
              const currentComments = p.comments || [];
              return {
                ...p,
                comments: [...currentComments, comment],
                commentsCount: currentComments.length + 1
              };
            }
            return p;
          })
        );
        this.commentDrafts[postId] = '';
        this.showToast('Comentario añadido exitosamente.', 'success');
      }
    });
  }

  handleDeletePost(postId: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta publicación?')) {
      this.feedService.deletePost(postId).subscribe({
        next: () => {
          this.posts.update((items) => items.filter((p) => p.id !== postId));
          this.showToast('Publicación eliminada correctamente.', 'info');
        }
      });
    }
  }

  // Acciones en Recomendaciones Laborales
  handleApplyJob(job: JobRecommendationResponse): void {
    if (job.isApplied) return;

    this.jobService.applyToJob(job.id).subscribe({
      next: () => {
        this.recommendations.update((items) =>
          items.map((j) => (j.id === job.id ? { ...j, isApplied: true } : j))
        );
        this.showToast(`¡Postulación enviada en 1 Clic a ${job.companyName}!`, 'success');
      }
    });
  }

  handleSaveJob(job: JobRecommendationResponse): void {
    this.jobService.toggleSaveJob(job.id).subscribe({
      next: (saved) => {
        this.recommendations.update((items) =>
          items.map((j) => (j.id === job.id ? { ...j, isSaved: saved } : j))
        );
        this.showToast(saved ? 'Vacante guardada en tus favoritos.' : 'Vacante removida de favoritos.', 'info');
      }
    });
  }

  handleDismissJob(jobId: string, event: Event): void {
    event.stopPropagation();
    this.jobService.dismissRecommendation(jobId).subscribe({
      next: () => {
        this.recommendations.update((items) => items.filter((j) => j.id !== jobId));
        this.showToast('Recomendación descartada.', 'info');
      }
    });
  }

  // Modal de IA Matching
  openAiAnalysis(job: JobRecommendationResponse): void {
    this.selectedJobForAi.set(job);
    this.isAnalyzingAi.set(true);
    setTimeout(() => {
      this.isAnalyzingAi.set(false);
    }, 600);
  }

  closeAiModal(): void {
    this.selectedJobForAi.set(null);
  }

  // Modal de Validación Formal
  openValidationModal(): void {
    this.showValidationModal.set(true);
  }

  closeValidationModal(): void {
    this.showValidationModal.set(false);
  }

  // Notificaciones Toast
  showToast(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  // Helpers de Formato
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'Reciente';
    const d = new Date(date);
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
