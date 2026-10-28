import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { JobSearch } from './pages/jobs/job-search';
import { Messages } from './pages/messages/messages';
import { Profile } from './pages/profile/profile';

import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Rutas de Autenticación (Sin Navbar)
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Rutas Principales de la Plataforma
  { path: 'jobs', component: JobSearch },
  { path: 'messages', component: Messages },
  { path: 'profile', component: Profile },
  // El navbar ya enlaza 'Ver mi perfil' a /profile/me
  { path: 'profile/me', redirectTo: 'profile', pathMatch: 'full' },

  // Feed / Dashboard Principal
  { path: 'feed', component: Dashboard },
  { path: 'dashboard', redirectTo: 'feed', pathMatch: 'full' },

  // Cualquier ruta desconocida redirige a login
  { path: '**', redirectTo: 'login' }
];