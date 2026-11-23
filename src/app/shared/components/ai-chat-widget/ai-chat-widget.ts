import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserRole } from '../../../core/models/auth.model';
import { AgentUiMessage } from '../../../core/models/agent.model';
import { AgentService } from '../../../core/services/agent.service';
import { AuthService } from '../../../core/services/auth.service';
import { readApiError } from '../../../core/utils/api-error';
import { roleLabel } from '../../../core/utils/labels';

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat-widget.html'
})
export class AiChatWidget {
  private readonly authService = inject(AuthService);
  private readonly agentService = inject(AgentService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('chatScroller');
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private lastUserId: string | null = null;

  readonly isAuthenticated = computed(() => Boolean(this.authService.session()?.token));
  readonly currentRole = computed<UserRole>(
    () => this.authService.session()?.role || this.authService.currentUserRole() || 'POSTULANT'
  );
  readonly roleLabelText = computed(() => roleLabel(this.currentRole()));

  readonly isOpen = signal(false);
  readonly isSending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly messages = signal<AgentUiMessage[]>([]);
  draft = '';

  readonly quickSuggestions = computed<string[]>(() => {
    switch (this.currentRole()) {
      case 'RECRUITER':
        return [
          'Resume el estado de mis vacantes activas',
          '¿Cómo atraer más postulantes verificados?',
          '¿Qué convenios universitarios tengo registrados?'
        ];
      case 'INSTITUTION':
        return [
          'Resume la tasa de empleabilidad actual',
          '¿Cuántos alumnos o habilidades tengo por validar?',
          'Sugiere acciones para impulsar convenios'
        ];
      default:
        return [
          '¿Qué vacantes activas coinciden con mis habilidades?',
          'Revisa el estado de mis postulaciones',
          '¿Qué habilidad me conviene reforzar primero?'
        ];
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }
    });

    effect(() => {
      const userId = this.authService.session()?.userId ?? null;
      untracked(() => {
        if (this.lastUserId !== userId) {
          this.lastUserId = userId;
          this.isOpen.set(false);
          this.messages.set([]);
          this.draft = '';
          this.errorMessage.set(null);
        }
      });
    });
  }

  toggleOpen(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.scrollToBottom();
    }
  }

  clearHistory(): void {
    this.messages.set([]);
    this.errorMessage.set(null);
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendPrompt();
    }
  }

  sendPrompt(preset?: string): void {
    const text = (preset ?? this.draft).trim();
    if (!text || this.isSending()) {
      return;
    }

    const userMsg: AgentUiMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: 'user',
      content: text.slice(0, 2000),
      createdAt: new Date()
    };

    this.messages.update((list) => [...list, userMsg]);
    if (!preset) {
      this.draft = '';
    }
    this.errorMessage.set(null);
    this.isSending.set(true);
    this.scrollToBottom();

    this.agentService.chat(userMsg.content).subscribe({
      next: (res) => {
        const assistantMsg: AgentUiMessage = {
          id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sender: 'assistant',
          content: res.reply?.trim() || 'Listo. ¿En qué más te puedo ayudar?',
          createdAt: new Date()
        };
        this.messages.update((list) => [...list, assistantMsg]);
        this.isSending.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        const msg = readApiError(err, 'No se pudo conectar con el asistente IA de UNEXT.');
        this.errorMessage.set(msg);
        this.isSending.set(false);
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom(): void {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    this.scrollTimer = setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
      this.scrollTimer = null;
    }, 30);
  }
}
