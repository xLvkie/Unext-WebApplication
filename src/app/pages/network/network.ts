import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Toast, ToastData, ToastType } from '../../shared/components/toast/toast';
import { AlertModal } from '../../shared/components/alert-modal/alert-modal';
import {
  ConnectionService,
  NetworkOverview,
  NetworkPersonCard
} from '../../core/services/connection.service';
import { FeedService } from '../../core/services/feed.service';
import { AuthService } from '../../core/services/auth.service';
import { FeedPostResponse } from '../../core/models/feed.model';
import { readApiError } from '../../core/utils/api-error';

export type ManagementTab = 'RECEIVED' | 'SENT' | 'CONNECTIONS' | 'FOLLOWING' | 'GROUPS';
export type SegmentFilter = 'ALL' | 'POSTULANT' | 'RECRUITER' | 'INSTITUTION';

@Component({
  selector: 'app-network',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, Toast, AlertModal],
  templateUrl: './network.html'
})
export class Network implements OnInit {
  private connectionService = inject(ConnectionService);
  private feedService = inject(FeedService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  readonly router = inject(Router);

  isLoading = signal(true);
  searchQuery = signal('');

  // Control de apertura/cierre (acordeón) de las 2 Cards principales del canvas
  isInvitationsCardOpen = signal(true);
  isRecommendationsCardOpen = signal(true);
  isNetworkFeedCardOpen = signal(false);

  // Pestaña activa en la Card 1 (Gestión de invitaciones y red)
  activeManagementTab = signal<ManagementTab>('RECEIVED');

  // Filtro de segmento en la Card 2 (Recomendaciones) y en el Feed filtrado
  selectedSegment = signal<SegmentFilter>('ALL');

  // Paginación incremental ("Estirar card para cargar más")
  readonly INITIAL_INVITATIONS_LIMIT = 4;
  readonly INITIAL_RECOMMENDATIONS_LIMIT = 6;
  invitationsLimit = signal(this.INITIAL_INVITATIONS_LIMIT);
  recommendationsLimit = signal(this.INITIAL_RECOMMENDATIONS_LIMIT);

  overview = signal<NetworkOverview>({
    connectionsCount: 0,
    receivedInvitationsCount: 0,
    sentInvitationsCount: 0,
    followingCount: 0,
    receivedInvitations: [],
    sentInvitations: [],
    connections: [],
    following: [],
    recommendations: []
  });

  allPosts = signal<FeedPostResponse[]>([]);

  // Modal de restricción de conexión (ej. Postulante -> Empresa sin haber postulado)
  isRestrictionModalOpen = signal(false);
  restrictionMessage = signal('');
  toast = signal<ToastData | null>(null);

  // Lista activa dentro de la Card 1 según la pestaña seleccionada
  activeManagementList = computed<NetworkPersonCard[]>(() => {
    const data = this.overview();
    const q = this.searchQuery().trim().toLowerCase();
    let list: NetworkPersonCard[] = [];

    switch (this.activeManagementTab()) {
      case 'RECEIVED':
        list = data.receivedInvitations;
        break;
      case 'SENT':
        list = data.sentInvitations;
        break;
      case 'CONNECTIONS':
        list = data.connections;
        break;
      case 'FOLLOWING':
        list = data.following;
        break;
      case 'GROUPS':
        list = [];
        break;
    }

    if (!q) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.headline.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  });

  visibleManagementItems = computed(() =>
    this.activeManagementList().slice(0, this.invitationsLimit())
  );

  hasMoreManagementItems = computed(
    () => this.activeManagementList().length > this.invitationsLimit()
  );

  // Lista filtrada de Recomendaciones (Card 2)
  filteredRecommendations = computed<NetworkPersonCard[]>(() => {
    const seg = this.selectedSegment();
    const q = this.searchQuery().trim().toLowerCase();

    return this.overview().recommendations.filter((person) => {
      const matchesSegment = seg === 'ALL' || person.role === seg;
      const matchesSearch =
        !q ||
        person.name.toLowerCase().includes(q) ||
        person.headline.toLowerCase().includes(q) ||
        person.subtitle.toLowerCase().includes(q);
      return matchesSegment && matchesSearch;
    });
  });

  visibleRecommendations = computed(() =>
    this.filteredRecommendations().slice(0, this.recommendationsLimit())
  );

  hasMoreRecommendations = computed(
    () => this.filteredRecommendations().length > this.recommendationsLimit()
  );

  // Publicaciones filtradas por el segmento elegido en Mi Red
  filteredNetworkPosts = computed(() => {
    const seg = this.selectedSegment();
    const q = this.searchQuery().trim().toLowerCase();

    return this.allPosts().filter((post) => {
      const matchesSeg = seg === 'ALL' || post.authorRole === seg;
      const matchesQuery =
        !q ||
        post.authorName.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q);
      return matchesSeg && matchesQuery;
    });
  });

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.route.queryParamMap.subscribe((params) => {
      const search = params.get('search');
      if (search) {
        this.searchQuery.set(search);
      }
    });

    this.loadNetworkData();
    this.loadNetworkFeed();
  }

  loadNetworkData(): void {
    this.isLoading.set(true);
    this.connectionService.getNetworkOverview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.isLoading.set(false);
        // Si no tiene invitaciones recibidas pero sí contactos, seleccionamos la pestaña más útil
        if (data.receivedInvitationsCount === 0 && data.sentInvitationsCount > 0) {
          this.activeManagementTab.set('SENT');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showToast(readApiError(err, 'No se pudo cargar la información de tu red.'), 'error');
      }
    });
  }

  loadNetworkFeed(): void {
    this.feedService.getGlobalFeed().subscribe({
      next: (posts) => this.allPosts.set(posts),
      error: () => this.allPosts.set([])
    });
  }

  // Cambiar de sección desde el Resumen Lateral Izquierdo
  selectSummarySection(tab: ManagementTab): void {
    this.activeManagementTab.set(tab);
    this.invitationsLimit.set(this.INITIAL_INVITATIONS_LIMIT);
    this.isInvitationsCardOpen.set(true);
  }

  // Controles para "Estirar" o "Contraer" la lista de invitaciones/contactos
  expandInvitationsList(): void {
    this.invitationsLimit.update((current) => current + 6);
  }

  collapseInvitationsList(): void {
    this.invitationsLimit.set(this.INITIAL_INVITATIONS_LIMIT);
  }

  // Controles para "Estirar" o "Contraer" la cuadrícula de recomendaciones
  expandRecommendationsList(): void {
    this.recommendationsLimit.update((current) => current + 6);
  }

  collapseRecommendationsList(): void {
    this.recommendationsLimit.set(this.INITIAL_RECOMMENDATIONS_LIMIT);
  }

  // Acciones de Conexión y Seguimiento
  handleConnect(person: NetworkPersonCard, event?: Event): void {
    event?.stopPropagation();

    if (!person.canConnect) {
      this.restrictionMessage.set(
        person.restrictionReason ||
          'No cumples los requisitos actuales para conectar con este perfil.'
      );
      this.isRestrictionModalOpen.set(true);
      return;
    }

    this.connectionService.sendRequest(person.userId).subscribe({
      next: () => {
        this.showToast(`Solicitud de conexión enviada a ${person.name}.`, 'success');
        this.loadNetworkData();
      },
      error: (err) => {
        this.restrictionMessage.set(
          readApiError(err, 'No se pudo enviar la solicitud de conexión.')
        );
        this.isRestrictionModalOpen.set(true);
      }
    });
  }

  handleAccept(person: NetworkPersonCard, event?: Event): void {
    event?.stopPropagation();
    if (!person.connectionId) return;

    this.connectionService.acceptRequest(person.connectionId).subscribe({
      next: () => {
        this.showToast(`¡Ahora estás conectado con ${person.name}!`, 'success');
        this.loadNetworkData();
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo aceptar la invitación.'), 'error');
      }
    });
  }

  handleRemoveOrIgnore(person: NetworkPersonCard, labelAction: string, event?: Event): void {
    event?.stopPropagation();
    this.connectionService.removeConnection(person.userId).subscribe({
      next: () => {
        this.showToast(labelAction, 'info');
        this.loadNetworkData();
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo procesar la solicitud.'), 'error');
      }
    });
  }

  handleToggleFollow(person: NetworkPersonCard, event?: Event): void {
    event?.stopPropagation();
    this.connectionService.toggleFollow(person.userId).subscribe({
      next: (res) => {
        this.showToast(
          res.following
            ? `Ahora sigues las publicaciones de ${person.name}.`
            : `Dejaste de seguir a ${person.name}.`,
          'info'
        );
        this.loadNetworkData();
      },
      error: (err) => {
        this.showToast(readApiError(err, 'No se pudo actualizar el seguimiento.'), 'error');
      }
    });
  }

  openPublicProfile(person: NetworkPersonCard): void {
    this.router.navigate(['/profile/view', person.role.toLowerCase(), person.profileId]);
  }

  initialsFor(name: string): string {
    return (
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || 'U'
    );
  }

  roleBadgeLabel(role: string): string {
    if (role === 'RECRUITER') return 'Empresa';
    if (role === 'INSTITUTION') return 'Institución';
    return 'Postulante';
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}