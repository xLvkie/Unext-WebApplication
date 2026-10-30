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

export interface NetworkPersonCard {
  connectionId?: string;
  userId: string;
  profileId: string;
  role: 'POSTULANT' | 'RECRUITER' | 'INSTITUTION';
  name: string;
  headline: string;
  subtitle: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bannerText?: string | null;
  isVerified: boolean;
  connectionStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'CONNECTED';
  isFollowing: boolean;
  canConnect: boolean;
  restrictionReason?: string | null;
  createdAt?: string | number[] | Date;
}

export interface NetworkOverview {
  connectionsCount: number;
  receivedInvitationsCount: number;
  sentInvitationsCount: number;
  followingCount: number;
  receivedInvitations: NetworkPersonCard[];
  sentInvitations: NetworkPersonCard[];
  connections: NetworkPersonCard[];
  following: NetworkPersonCard[];
  recommendations: NetworkPersonCard[];
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/connections`;

  getNetworkOverview(): Observable<NetworkOverview> {
    return this.http.get<NetworkOverview>(`${this.API_URL}/overview`);
  }

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

  toggleFollow(targetUserId: string): Observable<{ following: boolean }> {
    return this.http.post<{ following: boolean }>(`${this.API_URL}/follow/${targetUserId}`, {});
  }
}