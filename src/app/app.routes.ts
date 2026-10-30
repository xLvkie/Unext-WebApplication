import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Profile } from './pages/profile/postulant/profile';
import { JobSearch } from './pages/jobs/job-search';
import { Messages } from './pages/messages/messages';
import { Notifications } from './pages/notifications/notifications';
import { PublicProfile } from './pages/profile/postulant/public-profile';
import { Network } from './pages/network/network';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'profile/view/:role/:id', component: PublicProfile },
  { path: 'register', component: Register },

  // Perfil y Onboarding 
  { path: 'profile/me', component: Profile },
  { path: 'onboarding/complete-profile', component: Profile },

  // Feed / Dashboard Principal
  { path: 'feed', component: Dashboard },
  { path: 'dashboard', redirectTo: 'feed', pathMatch: 'full' },

  // Mi Red (Directorio y Conexiones)
  { path: 'directory', component: Network },
  { path: 'network', redirectTo: 'directory', pathMatch: 'full' },
  { path: 'red', redirectTo: 'directory', pathMatch: 'full' },

  // Vacantes, Mensajería y Notificaciones
  { path: 'jobs', component: JobSearch },
  { path: 'messages', component: Messages },
  { path: 'notifications', component: Notifications },

  { path: '**', redirectTo: 'login' }
];