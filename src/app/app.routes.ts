import { Routes } from '@angular/router';

import { JobSearchComponent } from './jobs/job-search.component';
import { ShellComponent } from './layout/shell.component';
import { MessagesComponent } from './messages/messages.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empleos' },
      { path: 'empleos', component: JobSearchComponent },
      { path: 'mensajes', component: MessagesComponent },
      { path: '**', redirectTo: 'empleos' },
    ],
  },
];
