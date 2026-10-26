import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { FeedPostRequest, FeedPostResponse, FeedCommentResponse } from '../models/feed.model';

@Injectable({
  providedIn: 'root'
})
export class FeedService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/feed';

  // Publicaciones de muestra con estética universitaria profesional y roles cruzados
  private mockPosts: FeedPostResponse[] = [
    {
      id: 'post-1',
      authorUserId: 'usr-101',
      authorRole: 'RECRUITER',
      authorName: 'Claudia Mendoza',
      authorHeadline: 'Lead Tech Recruiter · BCP Innovación Digital',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      isAuthorVerified: true,
      content: '¡Buscamos talento universitario para nuestro squad de Banca Móvil! 🚀 Buscamos 2 Practicantes Preprofesionales de Frontend (Angular / TypeScript). Ofrecemos convalidación directa de horas mediante convenio marco institucional UNEXT y mentoría con Tech Leads seniors.\n\nRevisen el match de compatibilidad en su feed lateral o postulen con 1 Clic.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80'
      ],
      likesCount: 38,
      commentsCount: 6,
      likedByMe: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 35), // hace 35 min
      comments: [
        {
          id: 'c-1',
          authorUserId: 'usr-202',
          authorName: 'Renzo Palacios',
          authorHeadline: 'Estudiante 9no Ciclo · UPC',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          content: '¡Excelente oportunidad! Acabo de enviar mi postulación con mis habilidades validadas por la universidad.',
          createdAt: new Date(Date.now() - 1000 * 60 * 20)
        },
        {
          id: 'c-2',
          authorUserId: 'usr-203',
          authorName: 'Camila Torres',
          authorHeadline: 'Ingeniería de Sistemas · PUCP',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          content: '¿La modalidad es 100% remota o híbrida para estudiantes de provincia?',
          createdAt: new Date(Date.now() - 1000 * 60 * 12)
        }
      ]
    },
    {
      id: 'post-2',
      authorUserId: 'usr-102',
      authorRole: 'INSTITUTION',
      authorName: 'Dirección de Empleabilidad UPC',
      authorHeadline: 'Universidad Peruana de Ciencias Aplicadas · Institución Verificada',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=150&auto=format&fit=crop&q=80',
      isAuthorVerified: true,
      content: '🎓 ¡Felicitamos a los más de 120 alumnos que completaron la Acreditación de Prácticas Preprofesionales del ciclo 2026-I mediante la plataforma UNEXT! Recuerden solicitar el sello de Validación Formal desde su módulo para que sus horas formativas figuren en su expediente digital.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&auto=format&fit=crop&q=80'
      ],
      likesCount: 94,
      commentsCount: 14,
      likedByMe: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 180), // hace 3 hrs
      comments: [
        {
          id: 'c-3',
          authorUserId: 'usr-204',
          authorName: 'Mateo Quispe',
          authorHeadline: 'Egresado de Software · UPC',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          content: 'El proceso de convalidación con la firma digital fue rapidísimo. Gran iniciativa 🙌',
          createdAt: new Date(Date.now() - 1000 * 60 * 95)
        }
      ]
    },
    {
      id: 'post-3',
      authorUserId: 'usr-103',
      authorRole: 'POSTULANT',
      authorName: 'Sebastián Morales R.',
      authorHeadline: 'Estudiante de Ing. de Software · 8vo Ciclo | Frontend & Cloud Enthusiast',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      isAuthorVerified: true,
      content: 'Acabamos de culminar nuestro proyecto del ciclo: un sistema de matching con IA y microservicios en Spring Boot + Angular 🚀. Logramos un 98% de cobertura en pruebas unitarias y convalidación técnica de habilidades. ¡Muy agradecido con el equipo de trabajo y docentes por el feedback constructivo!\n\n#IngenieriaDeSoftware #Angular #SpringBoot #UPC #MatchingIA',
      mediaUrls: [
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80'
      ],
      likesCount: 52,
      commentsCount: 4,
      likedByMe: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 360), // hace 6 hrs
      comments: []
    }
  ];

  getGlobalFeed(): Observable<FeedPostResponse[]> {
    return this.http.get<FeedPostResponse[]>(this.API_URL).pipe(
      catchError(() => of([...this.mockPosts]))
    );
  }

  createPost(request: FeedPostRequest): Observable<FeedPostResponse> {
    return this.http.post<FeedPostResponse>(this.API_URL, request).pipe(
      catchError(() => {
        // Fallback local instantáneo con ID único para desarrollo fluido
        const uniqueId = 'post-local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const newPost: FeedPostResponse = {
          id: uniqueId,
          authorUserId: 'usr-me',
          authorRole: 'POSTULANT',
          authorName: 'Alejandro Morales',
          authorHeadline: 'Estudiante de Ing. de Software · 8vo Ciclo | UPC',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          isAuthorVerified: true,
          content: request.content,
          mediaUrls: request.mediaUrls && request.mediaUrls.length > 0 ? request.mediaUrls : undefined,
          likesCount: 0,
          commentsCount: 0,
          likedByMe: false,
          createdAt: new Date(),
          comments: []
        };
        this.mockPosts = [newPost, ...this.mockPosts];
        return of(newPost);
      })
    );
  }

  toggleLike(postId: string): Observable<{ likesCount: number; likedByMe: boolean }> {
    return this.http.post<FeedPostResponse>(`${this.API_URL}/${postId}/like`, {}).pipe(
      map((res) => ({ likesCount: res.likesCount, likedByMe: res.likedByMe })),
      catchError(() => {
        const post = this.mockPosts.find((p) => p.id === postId);
        if (post) {
          post.likedByMe = !post.likedByMe;
          post.likesCount += post.likedByMe ? 1 : -1;
          return of({ likesCount: post.likesCount, likedByMe: post.likedByMe });
        }
        return of({ likesCount: 1, likedByMe: true });
      })
    );
  }

  addComment(postId: string, content: string): Observable<FeedCommentResponse> {
    return this.http.post<FeedCommentResponse>(`${this.API_URL}/${postId}/comments`, { content }).pipe(
      catchError(() => {
        const newComment: FeedCommentResponse = {
          id: 'c-local-' + Date.now(),
          authorUserId: 'usr-me',
          authorName: 'Alejandro Morales',
          authorHeadline: 'Estudiante de Ing. de Software · 8vo Ciclo | UPC',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          content,
          createdAt: new Date()
        };
        const post = this.mockPosts.find((p) => p.id === postId);
        if (post) {
          if (!post.comments) post.comments = [];
          post.comments.push(newComment);
          post.commentsCount = post.comments.length;
        }
        return of(newComment);
      })
    );
  }

  deletePost(postId: string): Observable<boolean> {
    return this.http.delete(`${this.API_URL}/${postId}`).pipe(
      map(() => true),
      catchError(() => {
        this.mockPosts = this.mockPosts.filter((p) => p.id !== postId);
        return of(true);
      })
    );
  }
}
