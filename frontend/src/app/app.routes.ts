import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { RESOURCES } from './core/resources';
import { unsavedChangesGuard } from './core/unsaved';

/**
 * Every content type in core/resources.ts gets three screens automatically:
 *   <basePath>       list
 *   <basePath>/new   create
 *   <basePath>/:id   edit
 * (the settings record is a single edit screen). Longer paths are listed first so that
 * "/services/categories" is not mistaken for "/services/:id".
 */
const resourceRoutes: Routes = Object.values(RESOURCES)
  .slice()
  .sort((a, b) => b.basePath.length - a.basePath.length)
  .flatMap((r) => {
    const path = r.basePath.replace(/^\//, '');
    const form = () => import('./features/resource/resource-form').then((m) => m.ResourceForm);
    const data = { resource: r.key };
    if (r.singleton) return [{ path, loadComponent: form, data, canDeactivate: [unsavedChangesGuard] }];
    return [
      { path, loadComponent: () => import('./features/resource/resource-list').then((m) => m.ResourceList), data },
      { path: `${path}/new`, loadComponent: form, data, canDeactivate: [unsavedChangesGuard] },
      { path: `${path}/:id`, loadComponent: form, data, canDeactivate: [unsavedChangesGuard] },
    ];
  });

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login').then((m) => m.Login), title: 'Log in · Website editor' },
  {
    path: '',
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/landings').then((m) => m.DashboardPage) },
      { path: 'pages', pathMatch: 'full', loadComponent: () => import('./features/landings').then((m) => m.PagesLanding) },
      { path: 'pages/:key', loadComponent: () => import('./features/page-editor').then((m) => m.PageEditor), canDeactivate: [unsavedChangesGuard] },
      { path: 'home-sections', loadComponent: () => import('./features/landings').then((m) => m.HomeSections) },
      { path: 'settings', pathMatch: 'full', loadComponent: () => import('./features/landings').then((m) => m.SettingsLanding) },
      { path: 'settings/images', loadComponent: () => import('./features/media-library').then((m) => m.MediaLibrary) },
      { path: 'settings/account', loadComponent: () => import('./features/account').then((m) => m.Account), canDeactivate: [unsavedChangesGuard] },
      { path: 'inbox', pathMatch: 'full', redirectTo: 'inbox/messages' },
      { path: 'inbox/messages', loadComponent: () => import('./features/inbox').then((m) => m.InboxList), data: { kind: 'messages' } },
      { path: 'inbox/messages/:id', loadComponent: () => import('./features/inbox').then((m) => m.InboxDetail), data: { kind: 'messages' } },
      { path: 'inbox/applications', loadComponent: () => import('./features/inbox').then((m) => m.InboxList), data: { kind: 'applications' } },
      { path: 'inbox/applications/:id', loadComponent: () => import('./features/inbox').then((m) => m.InboxDetail), data: { kind: 'applications' } },
      ...resourceRoutes,
      { path: '**', redirectTo: '' },
    ],
  },
];
