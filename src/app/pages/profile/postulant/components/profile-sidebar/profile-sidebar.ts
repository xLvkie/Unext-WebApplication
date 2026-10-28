import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Contact } from '../../../../../core/models/chat.model';

@Component({
  selector: 'app-profile-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile-sidebar.html'
})
export class ProfileSidebar {
  publicProfileUrl = input<string>('');
  suggestedPeers = input<Contact[]>([]);
}