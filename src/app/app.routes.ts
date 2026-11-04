import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';

// Perfil y Onboarding
import { PostulantProfile } from './pages/profile/postulant/postulant-profile';
import { PublicPosProfile } from './pages/profile/postulant/public-pos-profile';
import { RecruiterProfile } from './pages/profile/recruiter/recruiter-profile';
import { PublicRecProfile } from './pages/profile/recruiter/public-rec-profile';
import { InstitutionProfile } from './pages/profile/institution/institution-profile';
import { PublicInstProfile } from './pages/profile/institution/public-inst-profile';

// Funcionalidades principales
import { RecruiterJobs } from './pages/jobs/recruiter/recruiter-jobs';
import { JobSearch } from './pages/jobs/job-search';
import { Messages } from './pages/messages/messages';
import { Notifications } from './pages/notifications/notifications';
import { Network } from './pages/network/network';
import { InstitutionPortal } from './pages/institution/institution-portal';

export const routes: Routes = [
  // Redirección inicial
  { path: '', redirectTo: 'feed', pathMatch: 'full' },

  // Autenticación (Solo accesibles si NO ha iniciado sesión)
  { path: 'login', canActivate: [guestGuard], component: Login },
  { path: 'register', canActivate: [guestGuard], component: Register },

  // Gestión Académica (Exclusivo para el rol INSTITUTION)
  {
    path: 'institution/services',
    canActivate: [authGuard, roleGuard('INSTITUTION')],
    component: InstitutionPortal
  },
  {
    path: 'institution/validations',
    redirectTo: 'institution/services',
    pathMatch: 'full'
  },
  {
    path: 'institution/servicios',
    redirectTo: 'institution/services',
    pathMatch: 'full'
  },
  {
    path: 'institution/sede',
    redirectTo: 'institution/services',
    pathMatch: 'full'
  },
  {
    path: 'institution/portal',
    redirectTo: 'institution/services',
    pathMatch: 'full'
  },

  // Perfil propio protegido y enrutado según el segmento autenticado
  {
    path: 'profile/me',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'INSTITUTION'],
    component: InstitutionProfile
  },
  {
    path: 'profile/me',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    component: RecruiterProfile
  },
  {
    path: 'profile/me',
    canActivate: [authGuard, roleGuard('POSTULANT')],
    component: PostulantProfile
  },

  // Onboarding según el segmento autenticado
  {
    path: 'onboarding/complete-profile',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'INSTITUTION'],
    component: InstitutionProfile
  },
  {
    path: 'onboarding/complete-profile',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    component: RecruiterProfile
  },
  {
    path: 'onboarding/complete-profile',
    canActivate: [authGuard, roleGuard('POSTULANT')],
    component: PostulantProfile
  },

  // Vistas públicas de los 3 segmentos
  {
    path: 'profile/view/postulant/:id',
    canActivate: [authGuard],
    component: PublicPosProfile
  },
  {
    path: 'profile/view/recruiter/:id',
    canActivate: [authGuard],
    component: PublicRecProfile
  },
  {
    path: 'profile/view/institution/:id',
    canActivate: [authGuard],
    component: PublicInstProfile
  },
  {
    path: 'profile/view/:role/:id',
    canActivate: [authGuard],
    component: PublicPosProfile
  },

  // Feed / Dashboard Principal (Para los 3 segmentos)
  { path: 'feed', canActivate: [authGuard], component: Dashboard },
  { path: 'dashboard', redirectTo: 'feed', pathMatch: 'full' },

  // Mi Red (Directorio y Conexiones para los 3 segmentos)
  { path: 'directory', canActivate: [authGuard], component: Network },
  { path: 'network', redirectTo: 'directory', pathMatch: 'full' },
  { path: 'red', redirectTo: 'directory', pathMatch: 'full' },

  // Centro de Vacantes del Reclutador (Exclusivo para RECRUITER)
  {
    path: 'recruiter/jobs',
    canActivate: [authGuard, roleGuard('RECRUITER')],
    component: RecruiterJobs
  },
  { path: 'agreements', redirectTo: 'recruiter/jobs?tab=agreements', pathMatch: 'full' },

  // Buscador de Empleos (Si es RECRUITER abre su panel; si es POSTULANT abre JobSearch; bloqueado para INSTITUTION)
  {
    path: 'jobs',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    component: RecruiterJobs
  },
  {
    path: 'jobs',
    canActivate: [authGuard, roleGuard('POSTULANT')],
    component: JobSearch
  },

  // Mensajería y Notificaciones
  { path: 'messages', canActivate: [authGuard], component: Messages },
  { path: 'notifications', canActivate: [authGuard], component: Notifications },

  // ruta desconicida
  { path: '**', redirectTo: 'feed' }
];