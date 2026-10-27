export type UserRole = 'POSTULANT' | 'RECRUITER' | 'INSTITUTION';
export type Role = UserRole;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface Session {
  token: string;
  userId: string;
  role: UserRole;
  isProfileCompleted: boolean;
  email?: string;
}

export type AuthResponse = Session;