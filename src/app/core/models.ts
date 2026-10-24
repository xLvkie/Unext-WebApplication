export type Role = 'POSTULANT' | 'RECRUITER' | 'INSTITUTION';

export interface Session {
  token: string;
  userId: string;
  role: Role;
  isProfileCompleted: boolean;
}

export interface AuthResponse {
  token: string;
  userId: string;
  role: Role;
  isProfileCompleted: boolean;
}

export interface JobOffer {
  id: string;
  companyName: string;
  title: string;
  description: string;
  requirements?: string | null;
  requiredSkills?: string[] | null;
  location?: string | null;
  modality?: string | null;
  experienceLevel?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  isActive?: boolean;
  createdAt?: string | number[] | null;
  matchedSkills?: string[] | null;
  compatibilityPercent?: number | null;
  compatibilityLabel?: string | null;
}

export interface JobApplication {
  id: string;
  jobTitle: string;
  companyName: string;
  status: string;
  appliedAt?: string | number[] | null;
}

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
