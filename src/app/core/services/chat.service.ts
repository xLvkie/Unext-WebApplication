import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChatMessage } from '../../core/models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  inbox(): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiUrl}/messages/inbox`);
  }

  history(receiverId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiUrl}/messages/history/${receiverId}`);
  }

  send(receiverId: string, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${environment.apiUrl}/messages/send`, { receiverId, content });
  }
}
