import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FeedPostRequest, FeedPostResponse, FeedCommentResponse } from '../models/feed.model';

@Injectable({
  providedIn: 'root'
})
export class FeedService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/feed`;

  getGlobalFeed(): Observable<FeedPostResponse[]> {
    return this.http.get<FeedPostResponse[]>(this.API_URL);
  }

  getPostsByUser(userId: string): Observable<FeedPostResponse[]> {
    return this.http.get<FeedPostResponse[]>(`${this.API_URL}/user/${userId}`);
  }

  getImportantPostsByUser(userId: string): Observable<FeedPostResponse[]> {
    return this.http.get<FeedPostResponse[]>(`${this.API_URL}/user/${userId}/important`);
  }

  createPost(request: FeedPostRequest): Observable<FeedPostResponse> {
    return this.http.post<FeedPostResponse>(this.API_URL, request);
  }

  toggleLike(postId: string): Observable<FeedPostResponse> {
    return this.http.post<FeedPostResponse>(`${this.API_URL}/${postId}/like`, {});
  }

  toggleImportant(postId: string): Observable<FeedPostResponse> {
    return this.http.patch<FeedPostResponse>(`${this.API_URL}/${postId}/important`, {});
  }

  getCommentsByPost(postId: string): Observable<FeedCommentResponse[]> {
    return this.http.get<FeedCommentResponse[]>(`${this.API_URL}/${postId}/comments`);
  }

  addComment(postId: string, content: string): Observable<FeedCommentResponse> {
    return this.http.post<FeedCommentResponse>(`${this.API_URL}/${postId}/comments`, { content });
  }

  deletePost(postId: string): Observable<string> {
    return this.http.delete(`${this.API_URL}/${postId}`, { responseType: 'text' });
  }

  deleteComment(commentId: string): Observable<string> {
    return this.http.delete(`${this.API_URL}/comments/${commentId}`, { responseType: 'text' });
  }
}