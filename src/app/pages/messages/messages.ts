import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval } from 'rxjs';

import { readApiError } from '../../core/utils/api-error';
import { AuthService } from '../../core/services/auth.service';
import { DirectoryService } from '../../core/services/directory.service';
import { formatClock, formatDayLabel, initials, toDate } from '../../core/utils/format';
import { contextLabel } from '../../core/utils/labels';
import { ChatMessage, Conversation } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat.service';
import { Navbar } from '../../shared/components/navbar/navbar';
import { PostulantProfileResponse } from '../../core/models/profile.model';

interface ChatRow {
  kind: 'day' | 'message';
  key: string;
  label?: string;
  message?: ChatMessage;
  mine?: boolean;
}
  
@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [Navbar],
  templateUrl: './messages.html',
})

export class Messages {
  private readonly chat = inject(ChatService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly directory = inject(DirectoryService);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly query = signal('');
  readonly peopleQuery = signal('');
  readonly draft = signal('');
  readonly showPeople = signal(false);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly threadError = signal('');
  readonly inbox = signal<ChatMessage[]>([]);
  readonly history = signal<ChatMessage[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly opened = signal<Record<string, boolean>>({});
  private stickToBottom = true;

  readonly conversations = computed(() => {
    const me = this.auth.session()?.userId ?? '';
    const grouped = new Map<string, Conversation>();
    for (const message of this.inbox()) {
      const otherId = message.senderId === me ? message.receiverId : message.senderId;
      if (!otherId || grouped.has(otherId)) {
        continue;
      }
      grouped.set(otherId, {
        userId: otherId,
        name: this.directory.nameOf(otherId),
        preview: message.content,
        createdAt: message.createdAt,
        unread: message.receiverId === me && message.isRead === false,
        contextType: message.contextType,
      });
    }
    for (const userId of Object.keys(this.opened())) {
      if (!grouped.has(userId)) {
        grouped.set(userId, {
          userId,
          name: this.directory.nameOf(userId),
          preview: 'Nuevo chat',
          unread: false,
        });
      }
    }
    return [...grouped.values()].sort((a, b) => this.timeOf(b) - this.timeOf(a));
  });

  readonly visibleConversations = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) {
      return this.conversations();
    }
    return this.conversations().filter((item) => item.name.toLowerCase().includes(term) || item.preview.toLowerCase().includes(term));
  });

  readonly people = computed(() => {
    const me = this.auth.session()?.userId;
    const term = this.peopleQuery().trim().toLowerCase();
    return this.directory
      .contacts()
      .filter((contact) => contact.userId !== me)
      .filter((contact) => !term || contact.name.toLowerCase().includes(term) || contact.kind.toLowerCase().includes(term));
  });

  readonly selected = computed(() => this.conversations().find((item) => item.userId === this.selectedId()) ?? null);

  readonly rows = computed<ChatRow[]>(() => {
    const me = this.auth.session()?.userId;
    const rows: ChatRow[] = [];
    let lastDay = '';
    for (const message of this.history()) {
      const day = formatDayLabel(message.createdAt);
      if (day && day !== lastDay) {
        rows.push({ kind: 'day', key: `day-${day}-${message.id}`, label: day });
        lastDay = day;
      }
      rows.push({
        kind: 'message',
        key: message.id,
        message,
        mine: message.senderId === me,
      });
    }
    return rows;
  });

  constructor() {
    interval(8000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refreshQuiet());

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const userId = params.get('con');
      if (userId) {
        this.openConversation(userId);
      }
    });

    effect(() => {
      const session = this.auth.session();
      if (!session) {
        this.inbox.set([]);
        this.history.set([]);
        this.selectedId.set(null);
        return;
      }
      untracked(() => {
        this.directory.load().subscribe();
        this.loadInbox(false);
      });
    });
  }

  openConversation(userId: string): void {
    this.selectedId.set(userId);
    this.threadError.set('');
    this.showPeople.set(false);
    this.stickToBottom = true;
    this.opened.update((current) => ({ ...current, [userId]: true }));
    this.loadHistory(userId, false);
  }

  send(): void {
    const receiverId = this.selectedId();
    const content = this.draft().trim();
    if (!receiverId || !content || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.threadError.set('');
    this.chat.send(receiverId, content).subscribe({
      next: () => {
        this.draft.set('');
        this.sending.set(false);
        this.stickToBottom = true;
        this.loadHistory(receiverId, false);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.threadError.set(readApiError(error, 'No se pudo enviar el mensaje.'));
      },
    });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  onPeopleQuery(event: Event): void {
    this.peopleQuery.set((event.target as HTMLInputElement).value);
  }

  onDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    this.stickToBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  }

  initialsOf(name: string): string {
    return initials(name);
  }

  clock(value: unknown): string {
    return formatClock(value);
  }

  day(value: unknown): string {
    return formatDayLabel(value);
  }

  context(value: string | null | undefined): string {
    return contextLabel(value);
  }

  private timeOf(conversation: Conversation): number {
    return toDate(conversation.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  }

  private refreshQuiet(): void {
    if (!this.auth.session()) {
      return;
    }
    this.loadInbox(true);
    const selected = this.selectedId();
    if (selected) {
      this.loadHistory(selected, true);
    }
  }

  private loadInbox(quiet: boolean): void {
    if (!quiet) {
      this.loading.set(true);
    }
    this.chat.inbox().subscribe({
      next: (messages) => {
        this.inbox.set(messages);
        this.loading.set(false);
        this.error.set('');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (!quiet) {
          this.error.set(readApiError(error, 'No se pudo cargar la bandeja.'));
        }
      },
    });
  }

  private loadHistory(userId: string, quiet: boolean): void {
    this.chat.history(userId).subscribe({
      next: (messages) => {
        if (this.selectedId() !== userId) {
          return;
        }
        this.history.set(messages);
        this.scrollToEnd();
        if (!quiet) {
          this.loadInbox(true);
        }
      },
      error: (error: unknown) => {
        if (!quiet) {
          this.threadError.set(readApiError(error, 'No se pudo abrir la conversación.'));
        }
      },
    });
  }

  private scrollToEnd(): void {
    if (!this.stickToBottom) {
      return;
    }
    setTimeout(() => {
      const element = this.scroller()?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }, 0);
  }
}
