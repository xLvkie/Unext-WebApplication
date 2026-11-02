export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt?: string | number[] | null;
  isRead?: boolean;
  contextType?: string | null;
}

export interface Contact {
  userId: string;
  profileId?: string;
  name: string;
  subtitle: string;
  kind: 'Postulante' | 'Empresa' | 'Institución';
  avatarUrl?: string | null;
}

export interface Conversation {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  preview: string;
  createdAt?: string | number[] | null;
  unread: boolean;
  contextType?: string | null;
}