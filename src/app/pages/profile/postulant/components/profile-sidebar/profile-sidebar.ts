import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Contact } from '../../../../../core/models/chat.model';
import { FeedPostResponse } from '../../../../../core/models/feed.model';
import { toDate } from '../../../../../core/utils/format';

@Component({
  selector: 'app-profile-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-sidebar.html'
})
export class ProfileSidebar {
  importantPosts = input<FeedPostResponse[]>([]);
  maxImportantPosts = input<number>(3);
  isOwnProfile = input<boolean>(true);
  suggestedPeers = input<Contact[]>([]);

  unpinPost = output<string>();

  isVideo(url: string): boolean {
    return url.startsWith('data:video/') || /\.(mp4|webm|ogg)$/i.test(url);
  }

  formatShortDate(value: unknown): string {
    const d = toDate(value);
    if (!d) return 'Destacado';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }
}