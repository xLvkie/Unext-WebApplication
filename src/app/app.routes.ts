import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Redirección inicial
  { path: '', redirectTo: 'feed', pathMatch: 'full' },

  // Autenticación (Solo accesibles si NO ha iniciado sesión)
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.Login)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register/register').then((m) => m.Register)
  },

  // Gestión Académica (Exclusivo para el rol INSTITUTION)
  {
    path: 'institution/services',
    canActivate: [authGuard, roleGuard('INSTITUTION')],
    loadComponent: () => import('./pages/institution/institution-portal').then((m) => m.InstitutionPortal)
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
    loadComponent: () => import('./pages/profile/institution/institution-profile').then((m) => m.InstitutionProfile)
  },
  {
    path: 'profile/me',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    loadComponent: () => import('./pages/profile/recruiter/recruiter-profile').then((m) => m.RecruiterProfile)
  },
  {
    path: 'profile/me',
    canActivate: [authGuard, roleGuard('POSTULANT')],
    loadComponent: () => import('./pages/profile/postulant/postulant-profile').then((m) => m.PostulantProfile)
  },

  // Onboarding según el segmento autenticado
  {
    path: 'onboarding/complete-profile',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'INSTITUTION'],
    loadComponent: () => import('./pages/profile/institution/institution-profile').then((m) => m.InstitutionProfile)
  },
  {
    path: 'onboarding/complete-profile',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    loadComponent: () => import('./pages/profile/recruiter/recruiter-profile').then((m) => m.RecruiterProfile)
  },
  {
    path: 'onboarding/complete-profile',
    canActivate: [authGuard, roleGuard('POSTULANT')],
    loadComponent: () => import('./pages/profile/postulant/postulant-profile').then((m) => m.PostulantProfile)
  },

  // Vistas públicas de los 3 segmentos
  {
    path: 'profile/view/postulant/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/postulant/public-pos-profile').then((m) => m.PublicPosProfile)
  },
  {
    path: 'profile/view/recruiter/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/recruiter/public-rec-profile').then((m) => m.PublicRecProfile)
  },
  {
    path: 'profile/view/institution/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/institution/public-inst-profile').then((m) => m.PublicInstProfile)
  },
  {
    path: 'profile/view/:role/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/postulant/public-pos-profile').then((m) => m.PublicPosProfile)
  },

  // Feed / Dashboard Principal (Para los 3 segmentos)
  {
    path: 'feed',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard)
  },
  { path: 'dashboard', redirectTo: 'feed', pathMatch: 'full' },

  // Mi Red (Directorio y Conexiones para los 3 segmentos)
  {
    path: 'directory',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/network/network').then((m) => m.Network)
  },
  { path: 'network', redirectTo: 'directory', pathMatch: 'full' },
  { path: 'red', redirectTo: 'directory', pathMatch: 'full' },

  // Centro de Vacantes del Reclutador (Exclusivo para RECRUITER)
  {
    path: 'recruiter/jobs',
    canActivate: [authGuard, roleGuard('RECRUITER')],
    loadComponent: () => import('./pages/jobs/recruiter/recruiter-jobs').then((m) => m.RecruiterJobs)
  },
  { path: 'agreements', redirectTo: 'recruiter/jobs?tab=agreements', pathMatch: 'full' },

  // Buscador de Empleos (Si es RECRUITER abre su panel; si es POSTULANT abre JobSearch; bloqueado para INSTITUTION)
  {
    path: 'jobs',
    canActivate: [authGuard],
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    loadComponent: () => import('./pages/jobs/recruiter/recruiter-jobs').then((m) => m.RecruiterJobs)
  },
  {
    path: 'jobs',
    canActivate: [authGuard, roleGuard('POSTULANT')],
    loadComponent: () => import('./pages/jobs/job-search').then((m) => m.JobSearch)
  },

  // Mensajería y Notificaciones
  {
    path: 'messages',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/messages/messages').then((m) => m.Messages)
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/notifications/notifications').then((m) => m.Notifications)
  },

  // ruta desconicida
  { path: '**', redirectTo: 'feed' }
];