export interface AppNotification {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt?: string | number[] | null;
}
