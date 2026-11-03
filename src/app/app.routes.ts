import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';

import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';

// Perfil y Onboarding
import { PostulantProfile } from './pages/profile/postulant/postulant-profile';
import { PublicPosProfile } from './pages/profile/postulant/public-pos-profile';
import { RecruiterProfile } from './pages/profile/recruiter/recruiter-profile';
import { PublicRecProfile } from './pages/profile/recruiter/public-rec-profile';

// Funcionalidades principales
import { RecruiterJobs } from './pages/jobs/recruiter/recruiter-jobs';
import { JobSearch } from './pages/jobs/job-search';
import { Messages } from './pages/messages/messages';
import { Notifications } from './pages/notifications/notifications';
import { Network } from './pages/network/network';

export const routes: Routes = [
  // Autenticación
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Perfil y Onboarding
  {
    path: 'profile/me',
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    component: RecruiterProfile
  },
  {
    path: 'profile/me',
    component: PostulantProfile // Por defecto carga Postulante
  },

  {
    path: 'onboarding/complete-profile',
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    component: RecruiterProfile
  },
  {
    path: 'onboarding/complete-profile',
    component: PostulantProfile
  },

  // Vista pública de perfiles
  { path: 'profile/view/postulant/:id', component: PublicPosProfile },
  { path: 'profile/view/recruiter/:id', component: PublicRecProfile },

  // Feed / Dashboard Principal
  { path: 'feed', component: Dashboard },
  { path: 'dashboard', redirectTo: 'feed', pathMatch: 'full' },

  // Mi Red (Directorio y Conexiones)
  { path: 'directory', component: Network },
  { path: 'network', redirectTo: 'directory', pathMatch: 'full' },
  { path: 'red', redirectTo: 'directory', pathMatch: 'full' },

  // Vacantes
  { path: 'recruiter/jobs', component: RecruiterJobs },
  { path: 'agreements', redirectTo: 'recruiter/jobs?tab=agreements', pathMatch: 'full' },

  {
    path: 'jobs',
    canMatch: [() => inject(AuthService).getStoredRole() === 'RECRUITER'],
    component: RecruiterJobs
  },
  { path: 'jobs', component: JobSearch },

  // Mensajeria
  { path: 'messages', component: Messages },

  // Notificaciones
  { path: 'notifications', component: Notifications },

  { path: '**', redirectTo: 'login' }
];