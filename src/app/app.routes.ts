import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'World Cup 2026 Pool — Leaderboard',
    loadComponent: () =>
      import('./pages/leaderboard/leaderboard').then((m) => m.Leaderboard),
  },
  {
    path: 'schedule',
    title: 'World Cup 2026 Pool — Schedule',
    loadComponent: () => import('./pages/schedule/schedule').then((m) => m.Schedule),
  },
  {
    path: 'my-picks',
    title: 'World Cup 2026 Pool — My Picks',
    loadComponent: () => import('./pages/my-picks/my-picks').then((m) => m.MyPicks),
  },
  {
    path: 'admin',
    title: 'World Cup 2026 Pool — Admin',
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
  },
  { path: '**', redirectTo: '' },
];
