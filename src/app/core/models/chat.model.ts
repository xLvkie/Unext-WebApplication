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
  name: string;
  subtitle: string;
  kind: 'Postulante' | 'Empresa' | 'Institución';
}

export interface Conversation {
  userId: string;
  name: string;
  preview: string;
  createdAt?: string | number[] | null;
  unread: boolean;
  contextType?: string | null;
}