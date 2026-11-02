export interface FeedCommentResponse {
  id: string;
  postId?: string;
  authorUserId: string;
  authorProfileId?: string;
  authorRole?: 'POSTULANT' | 'RECRUITER' | 'INSTITUTION' | string;
  authorName: string;
  authorAvatarUrl?: string;
  authorHeadline?: string;
  isAuthorVerified?: boolean;
  content: string;
  createdAt: string | number[] | Date;
}

export interface FeedPostResponse {
  id: string;
  authorUserId: string;
  authorProfileId?: string;
  authorRole: 'POSTULANT' | 'RECRUITER' | 'INSTITUTION';
  authorName: string;
  authorHeadline: string;
  authorAvatarUrl?: string;
  isAuthorVerified: boolean;
  content: string;
  mediaUrls?: string[];
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  isImportant: boolean;
  expiresAt?: string | number[] | Date | null;
  createdAt: string | number[] | Date;
  comments?: FeedCommentResponse[];
}

export interface FeedPostRequest {
  content: string;
  mediaUrls?: string[];
  isImportant?: boolean;
}