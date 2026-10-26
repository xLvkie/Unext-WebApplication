export interface FeedCommentResponse {
  id: string;
  authorUserId: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorHeadline?: string;
  content: string;
  createdAt: string | Date;
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
  createdAt: string | Date;
  comments?: FeedCommentResponse[];
}

export interface FeedPostRequest {
  content: string;
  mediaUrls?: string[];
}
