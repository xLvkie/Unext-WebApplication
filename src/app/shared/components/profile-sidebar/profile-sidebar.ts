import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Contact } from '../../../core/models/chat.model';
import { FeedPostResponse } from '../../../core/models/feed.model';
import { formatShortDate as formatShortDateUtil } from '../../../core/utils/format';
import { isVideoUrl } from '../../../core/utils/file-media';

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
    return isVideoUrl(url);
  }

  formatShortDate(value: unknown): string {
    return formatShortDateUtil(value, { fallback: 'Destacado', includeYear: false });
  }
}