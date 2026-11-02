export type NotificationCategory = 'ALL' | 'UNREAD' | 'JOBS' | 'ACADEMIC' | 'FEED';

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string | number[] | Date;
}