export type UserRole = 'POSTULANT' | 'RECRUITER' | 'INSTITUTION';

// Indicamos el tipo de datos que se espera recibir en la solicitud de inicio de sesión y registro, 
// así como la respuesta de autenticación. Esto nos permite tener un control más estricto sobre los datos 
// que manejamos en nuestra aplicación y facilita la detección de errores en tiempo de compilación.

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  role?: UserRole;
  email?: string;
  isProfileCompleted?: boolean;
}