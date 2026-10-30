import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConnectionStatusResponse {
  connectionId?: string;
  targetUserId: string;
  status: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'CONNECTED';
  canConnect: boolean;
  restrictionReason?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/connections`;

  getStatusWithUser(targetUserId: string): Observable<ConnectionStatusResponse> {
    return this.http.get<ConnectionStatusResponse>(`${this.API_URL}/status/${targetUserId}`);
  }

  sendRequest(targetUserId: string): Observable<ConnectionStatusResponse> {
    return this.http.post<ConnectionStatusResponse>(`${this.API_URL}/request/${targetUserId}`, {});
  }

  acceptRequest(connectionId: string): Observable<ConnectionStatusResponse> {
    return this.http.post<ConnectionStatusResponse>(`${this.API_URL}/${connectionId}/accept`, {});
  }

  removeConnection(targetUserId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/user/${targetUserId}`);
  }
}