import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { JobSearch } from './pages/jobs/job-search';
import { Messages } from './pages/messages/messages';
import { Notifications } from './pages/notifications/notifications';

import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Rutas de Autenticación (Sin Navbar)
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Rutas Principales de la Plataforma
  { path: 'jobs', component: JobSearch },
  { path: 'messages', component: Messages },
  { path: 'notifications', component: Notifications },

  // Feed / Dashboard Principal
  { path: 'feed', component: Dashboard },
  { path: 'dashboard', redirectTo: 'feed', pathMatch: 'full' },

  // Cualquier ruta desconocida redirige a login
  { path: '**', redirectTo: 'login' }
];