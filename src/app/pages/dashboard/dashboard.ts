import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../shared/components/toast/toast';
import { FeedService } from '../../core/services/feed.service';
import { JobService } from '../../core/services/job.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { FeedPostResponse } from '../../core/models/feed.model';
import {
  JobApplication,
  JobOffer,
  JobRecommendationResponse
} from '../../core/models/job.model';
import {
  InstitutionProfileResponse,
  PostulantProfileResponse,
  RecruiterProfileResponse
} from '../../core/models/profile.model';
import { readApiError } from '../../core/utils/api-error';
import { applicationLabel } from '../../core/utils/labels';
import { toDate } from '../../core/utils/format';
import { processFeedMediaFile } from '../../core/utils/file-media';

export interface MediaAttachmentPreview {
  dataUrl: string;
  type: 'image' | 'video' | 'gif';
  name: string;
}

export interface RecruiterCandidateSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  career?: string | null;
  isInstitutionVerified?: boolean;
}

export interface PendingStudentItem {
  postulantId: string;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
}

export interface PendingValidationItem {
  validationId: string;
  studentName: string;
  skillName: string;
  evidenceUrl?: string;
  status: string;
}

export interface AiJobBlueprint {
  roleTitle: string;
  suggestedModality: string;
  suggestedLevel: string;
  salaryRange: string;
  recommendedSkills: string[];
  optimizedDescription: string;
}

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
  private http = inject(HttpClient);
  readonly router = inject(Router);

  posts = signal<FeedPostResponse[]>([]);
  recommendations = signal<JobRecommendationResponse[]>([]);
  myApplications = signal<JobApplication[]>([]);

  // Estados exclusivos cuando el usuario logueado es RECRUITER
  recruiterData = signal<RecruiterProfileResponse | null>(null);
  recruiterJobs = signal<JobOffer[]>([]);
  recruiterCandidatesCount = signal<number>(0);
  verifiedTalentPool = signal<RecruiterCandidateSummary[]>([]);

  // Estados exclusivos cuando el usuario logueado es INSTITUTION
  institutionData = signal<InstitutionProfileResponse | null>(null);
  institutionPendingStudents = signal<PendingStudentItem[]>([]);
  institutionPendingValidations = signal<PendingValidationItem[]>([]);
  institutionAgreements = signal<any[]>([]);
  institutionStats = signal<{
    totalVerifiedStudents: number;
    totalActiveAgreements: number;
    totalEndorsedCompanies: number;
    employabilityRate: number;
  }>({
    totalVerifiedStudents: 0,
    totalActiveAgreements: 0,
    totalEndorsedCompanies: 0,
    employabilityRate: 0
  });

  isLoadingFeed = signal(false);
  isProfileIncomplete = signal(false);

  profile = signal<PostulantProfileResponse>({
    id: '',
    userId: '',
    firstName: '',
    lastName: '',
    skills: []
  });

  currentUserId = computed(
    () => this.profile().userId || this.authService.session()?.userId || ''
  );

  currentRole = computed(() => this.authService.getStoredRole() || 'POSTULANT');

  maxImportantPosts = computed(() => {
    const role = this.currentRole();
    if (role === 'INSTITUTION') return 6;
    if (role === 'RECRUITER') return 5;
    return 3;
  });

  myImportantPostsCount = computed(
    () =>
      this.posts().filter(
        (p) => p.authorUserId === this.currentUserId() && p.isImportant
      ).length
  );

  fullName = computed(() => {
    const first = this.profile().firstName?.trim();
    const last = this.profile().lastName?.trim();
    return first || last ? `${first} ${last}`.trim() : 'Mi Cuenta';
  });

  userInitials = computed(() => {
    const first = this.profile().firstName?.charAt(0) || '';
    const last = this.profile().lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  });

  validatedSkills = computed(() =>
    (this.profile().skills || []).filter((s) => Boolean(s.isValidatedByInstitution))
  );

  activeRecruiterJobs = computed(() =>
    this.recruiterJobs().filter((j) => j.isActive !== false)
  );

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

  // Creación de Post
  newPostContent = '';
  newPostImportant = false;
  selectedMedia = signal<MediaAttachmentPreview[]>([]);
  isPosting = signal(false);

  openComments = signal<Record<string, boolean>>({});
  commentDrafts: Record<string, string> = {};
  toast = signal<ToastData | null>(null);

  // Modales Postulante vs Reclutador
  selectedJobForAi = signal<JobRecommendationResponse | null>(null);
  isAnalyzingAi = signal(false);
  showValidationModal = signal(false);

  // Modales de Funciones Inteligentes IA para el Reclutador
  showRecruiterOptimizerModal = signal(false);
  showRecruiterRadarModal = signal(false);
  aiRolePrompt = 'Desarrollador Full Stack Junior / Practicante';
  generatedBlueprint = signal<AiJobBlueprint>({
    roleTitle: 'Desarrollador Full Stack Junior (Angular + Spring Boot)',
    suggestedModality: 'HYBRID',
    suggestedLevel: 'JUNIOR',
    salaryRange: 'S/. 1,800 - S/. 2,800 al mes',
    recommendedSkills: ['Angular', 'TypeScript', 'Java', 'Spring Boot', 'PostgreSQL', 'Git'],
    optimizedDescription:
      'Buscamos talento universitario o recién egresado apasionado por el desarrollo de aplicaciones web escalables, con bases sólidas en arquitectura REST, componentes standalone en Angular y persistencia relacional.'
  });

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoadingFeed.set(true);

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

    const role = this.currentRole();
    if (role === 'POSTULANT') {
      this.profileService.getMyPostulantProfile().subscribe({
        next: (data) => {
          this.profile.set(data);
          this.isProfileIncomplete.set(false);
        },
        error: () => this.isProfileIncomplete.set(true)
      });

      this.jobService.getRecommendations().subscribe({
        next: (data) => this.recommendations.set(data),
        error: () => this.recommendations.set([])
      });

      this.jobService.myApplications().subscribe({
        next: (apps) => this.myApplications.set(apps.slice(0, 3)),
        error: () => this.myApplications.set([])
      });
    } else if (role === 'RECRUITER') {
      this.profileService.getMyRecruiterProfile().subscribe({
        next: (data) => {
          this.recruiterData.set(data);
          this.profile.set({
            id: data.id || '',
            userId: data.userId || '',
            firstName: data.companyName || 'Empresa',
            lastName: '',
            studentCode: data.ruc || '—',
            career: data.industry || 'Sector Corporativo',
            avatarUrl: data.companyLogoUrl || null,
            headline:
              data.headline ||
              (data.industry ? `${data.industry} · RUC ${data.ruc}` : 'Cuenta Corporativa'),
            isInstitutionVerified: Boolean(data.isVerified || data.isValidated),
            institutionName: 'Organización Corporativa',
            skills: []
          });
        },
        error: () => this.isProfileIncomplete.set(true)
      });

      // Cargar vacantes del reclutador y conteo de postulaciones recibidas
      this.loadRecruiterDashboardWidgets();
    } else if (role === 'INSTITUTION') {
      this.profileService.getMyInstitutionProfile().subscribe({
        next: (data) => {
          const isVerified = Boolean(
            data.isVerified ||
            (data.id && localStorage.getItem(`unext_inst_verified_${data.id}`) === 'true') ||
            (data.userId && localStorage.getItem(`unext_inst_verified_${data.userId}`) === 'true') ||
            localStorage.getItem('unext_inst_verified_current') === 'true'
          );

          this.institutionData.set({ ...data, isVerified });
          this.profile.set({
            id: data.id || '',
            userId: data.userId || '',
            firstName: data.name || 'Institución',
            lastName: '',
            avatarUrl: data.logoUrl || null,
            headline: data.domain ? `Dominio oficial: ${data.domain}` : 'Institución Educativa',
            isInstitutionVerified: isVerified,
            institutionName: data.name || 'Institución Oficial',
            skills: []
          });
        },
        error: () => this.isProfileIncomplete.set(true)
      });

      this.loadInstitutionDashboardWidgets();
    }
  }

  private loadInstitutionDashboardWidgets(): void {
    // 1. Alumnos por Acreditar
    this.http.get<PendingStudentItem[]>(`${environment.apiUrl}/institution/students/pending`).subscribe({
      next: (list) => this.institutionPendingStudents.set(list || []),
      error: () => this.institutionPendingStudents.set([])
    });

    // 2. Validar Habilidades
    this.http.get<PendingValidationItem[]>(`${environment.apiUrl}/institution/validations/pending`).subscribe({
      next: (list) => this.institutionPendingValidations.set(list || []),
      error: () => this.institutionPendingValidations.set([])
    });

    // 3. Convenios Corporativos
    this.http.get<any[]>(`${environment.apiUrl}/institution/agreements`).subscribe({
      next: (list) => this.institutionAgreements.set(list || []),
      error: () => this.institutionAgreements.set([])
    });

    // 4. Estadísticas
    this.http.get<any>(`${environment.apiUrl}/institution/dashboard/stats`).subscribe({
      next: (s) => {
        if (s) {
          this.institutionStats.set({
            totalVerifiedStudents: s.totalVerifiedStudents ?? s.totalStudents ?? 0,
            totalActiveAgreements: s.totalActiveAgreements ?? 0,
            totalEndorsedCompanies: s.totalEndorsedCompanies ?? 0,
            employabilityRate: s.employabilityRate ?? 0
          });
        }
      },
      error: () => {}
    });
  }

  verifyStudentFromDashboard(postulantId: string, status: 'APPROVED' | 'REJECTED'): void {
    this.http
      .patch<string>(
        `${environment.apiUrl}/institution/students/${postulantId}/verify?status=${status}`,
        {},
        { responseType: 'text' as 'json' }
      )
      .subscribe({
        next: () => {
          this.showToast(
            status === 'APPROVED' ? 'Alumno acreditado con éxito.' : 'Solicitud académica rechazada.',
            status === 'APPROVED' ? 'success' : 'info'
          );
          this.loadInstitutionDashboardWidgets();
        },
        error: (err) => {
          this.showToast(readApiError(err, 'No se pudo actualizar el estado del alumno.'), 'error');
        }
      });
  }

  verifySkillFromDashboard(validationId: string, status: 'APPROVED' | 'REJECTED'): void {
    this.http
      .patch<string>(
        `${environment.apiUrl}/institution/validations/${validationId}/status`,
        { status },
        { responseType: 'text' as 'json' }
      )
      .subscribe({
        next: () => {
          this.showToast(
            status === 'APPROVED' ? 'Habilidad técnica avalada oficialmente.' : 'Validación rechazada.',
            status === 'APPROVED' ? 'success' : 'info'
          );
          this.loadInstitutionDashboardWidgets();
        },
        error: (err) => {
          this.showToast(readApiError(err, 'No se pudo convalidar la habilidad técnica.'), 'error');
        }
      });
  }

  private loadRecruiterDashboardWidgets(): void {
    // 1. Mis vacantes publicadas
    this.http.get<JobOffer[]>(`${environment.apiUrl}/recruiter/jobs`).subscribe({
      next: (jobs) => {
        this.recruiterJobs.set(jobs);
        // Contamos candidatos recibidos en las primeras vacantes activas
        let totalCandidates = 0;
        jobs.slice(0, 3).forEach((job) => {
          this.http
            .get<any[]>(`${environment.apiUrl}/recruiter/jobs/${job.id}/applications`)
            .subscribe({
              next: (apps) => {
                totalCandidates += apps.length;
                this.recruiterCandidatesCount.set(totalCandidates);
              },
              error: () => {}
            });
        });
      },
      error: () => this.recruiterJobs.set([])
    });

    // 2. Radar de talento verificado en la plataforma
    this.http
      .get<RecruiterCandidateSummary[]>(`${environment.apiUrl}/profiles/postulants/directory`)
      .subscribe({
        next: (list) => {
          const prioritized = [...list].sort(
            (a, b) => Number(Boolean(b.isInstitutionVerified)) - Number(Boolean(a.isInstitutionVerified))
          );
          this.verifiedTalentPool.set(prioritized.slice(0, 4));
        },
        error: () => this.verifiedTalentPool.set([])
      });
  }

  // =========================================================================
  // CONTENEDORES VISUALES DE IA (Lógica pendiente de implementar más adelante)
  // =========================================================================
  handleHeaderIntelligentAction(): void {
    if (this.currentRole() === 'INSTITUTION') {
      // Función inteligente IA para institución (próximamente) - no hace nada por ahora
      return;
    } else if (this.currentRole() === 'RECRUITER') {
      this.openRecruiterJobOptimizer();
    } else {
      this.openAiAnalysis(this.recommendations()[0]);
    }
  }

  openRecruiterJobOptimizer(): void {
    // TODO: Conectar más adelante con el endpoint o servicio de IA para generar borradores
    this.showRecruiterOptimizerModal.set(true);
  }

  generateBlueprintFromPrompt(): void {
    // TODO: Aquí se implementará la lógica de generación y optimización de vacante con IA
    this.showToast('El motor de IA se conectará en una siguiente fase.', 'info');
  }

  copyBlueprintAndGoToJobs(): void {
    // TODO: Pasar los parámetros generados por IA al creador de vacantes
    this.showRecruiterOptimizerModal.set(false);
    this.router.navigate(['/recruiter/jobs']);
  }

  openAiAnalysis(job: JobRecommendationResponse | undefined): void {
    // TODO: Aquí se implementará el cálculo detallado de compatibilidad IA para el postulante
    if (!job) {
      this.showToast('Vista previa de compatibilidad IA (lógica pendiente).', 'info');
      return;
    }
    this.selectedJobForAi.set(job);
  }

  // =========================================================================
  // MULTIMEDIA Y PUBLICACIONES DEL FEED
  // =========================================================================
  async onMediaFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const current = this.selectedMedia();
    if (current.length + files.length > 4) {
      this.showToast('Puedes adjuntar un máximo de 4 archivos multimedia por publicación.', 'warning');
      input.value = '';
      return;
    }

    for (const file of Array.from(files)) {
      try {
        const dataUrl = await processFeedMediaFile(file);
        const type: 'image' | 'video' | 'gif' = file.type.startsWith('video/')
          ? 'video'
          : file.type === 'image/gif'
          ? 'gif'
          : 'image';

        this.selectedMedia.update((list) => [...list, { dataUrl, type, name: file.name }]);
      } catch (err: any) {
        this.showToast(err?.message || 'Archivo multimedia no válido.', 'error');
      }
    }

    input.value = '';
  }

  removeSelectedMedia(index: number): void {
    this.selectedMedia.update((list) => list.filter((_, i) => i !== index));
  }

  isVideoMedia(url: string): boolean {
    return url.startsWith('data:video/') || /\.(mp4|webm|ogg)$/i.test(url);
  }

  handleCreatePost(): void {
    const content = this.newPostContent.trim();
    if (!content) {
      this.showToast('Por favor escribe algún contenido para tu publicación.', 'warning');
      return;
    }

    if (this.newPostImportant && this.myImportantPostsCount() >= this.maxImportantPosts()) {
      this.showToast(
        `Ya alcanzaste tu límite de ${this.maxImportantPosts()} publicaciones importantes.`,
        'warning'
      );
      return;
    }

    this.isPosting.set(true);
    const mediaUrls = this.selectedMedia().map((m) => m.dataUrl);

    this.feedService
      .createPost({
        content,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        isImportant: this.newPostImportant
      })
      .subscribe({
        next: (created) => {
          const enrichedPost: FeedPostResponse = {
            ...created,
            authorAvatarUrl: created.authorAvatarUrl || this.profile().avatarUrl || undefined,
            authorHeadline: created.authorHeadline || this.profile().headline || ''
          };
          this.posts.update((prev) => [enrichedPost, ...prev]);
          this.newPostContent = '';
          this.newPostImportant = false;
          this.selectedMedia.set([]);
          this.isPosting.set(false);
          this.showToast(
            created.isImportant
              ? '¡Publicación importante fijada en tu perfil y en el feed!'
              : '¡Publicación compartida en el feed (activa por 7 días)!',
            'success'
          );
        },
        error: (err) => {
          this.isPosting.set(false);
          this.showToast(readApiError(err, 'No se pudo publicar en el feed.'), 'error');
        }
      });
  }

  handleToggleImportant(post: FeedPostResponse): void {
    this.feedService.toggleImportant(post.id).subscribe({
      next: (updated) => {
        this.posts.update((items) =>
          items.map((p) =>
            p.id === post.id
              ? { ...p, isImportant: updated.isImportant, expiresAt: updated.expiresAt }
              : p
          )
        );
        this.showToast(
          updated.isImportant
            ? '📌 Publicación marcada como importante (no caducará y se mostrará en tu perfil).'
            : 'Publicación removida de importantes (caducará en 7 días).',
          'info'
        );
      },
      error: (err) => {
        this.showToast(
          readApiError(
            err,
            `Solo puedes fijar hasta ${this.maxImportantPosts()} publicaciones importantes.`
          ),
          'warning'
        );
      }
    });
  }

  navigateToAuthorProfile(
    authorUserId: string,
    authorProfileId: string | undefined,
    authorRole: string | undefined
  ): void {
    if (authorUserId === this.currentUserId()) {
      this.router.navigate(['/profile/me']);
      return;
    }

    const roleSlug = (authorRole || 'POSTULANT').toLowerCase();
    const targetId = authorProfileId || authorUserId;
    this.router.navigate(['/profile/view', roleSlug, targetId]);
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

  formatDate(value: unknown): string {
    const d = toDate(value);
    if (!d) return 'Reciente';
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  }

  formatExpirationRemaining(expiresAt: unknown): string {
    const exp = toDate(expiresAt);
    if (!exp) return '7 días';
    const diffMs = exp.getTime() - Date.now();
    if (diffMs <= 0) return 'Por expirar';
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours} h restantes`;
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays} d restantes`;
  }
}