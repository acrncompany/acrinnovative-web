import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit, ViewChild, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { CountsService } from '../core/counts.service';
import { siteLink } from '../core/site';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  exact?: boolean;
  badge?: 'inbox';
}

/** The frame around every admin screen: top bar, menu (a slide-out drawer on phones), and the content area. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule, MatBadgeModule, MatMenuModule],
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav #nav [mode]="mobile() ? 'over' : 'side'" [opened]="!mobile()" class="nav" [fixedInViewport]="true" role="navigation">
        <div class="brand"><mat-icon>web</mat-icon><div><strong>Website editor</strong><small>ACR Innovative</small></div></div>
        <mat-nav-list>
          @for (item of items; track item.path) {
            <a mat-list-item [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!item.exact }" (click)="closeIfMobile()">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
              @if (item.badge === 'inbox' && counts.unreadTotal() > 0) {
                <span matListItemMeta class="badge" [attr.aria-label]="counts.unreadTotal() + ' unread'">{{ counts.unreadTotal() }}</span>
              }
            </a>
          }
        </mat-nav-list>
        <div class="foot">
          <a mat-stroked-button [href]="siteHome" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> View website</a>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="top">
          @if (mobile()) {
            <button mat-icon-button type="button" (click)="nav.toggle()" aria-label="Open menu"><mat-icon matBadge="!" [matBadgeHidden]="counts.unreadTotal() === 0" matBadgeSize="small">menu</mat-icon></button>
          }
          <span class="title">{{ mobile() ? 'Website editor' : '' }}</span>
          <span class="spacer"></span>
          <button mat-button type="button" [matMenuTriggerFor]="user"><mat-icon>account_circle</mat-icon> <span class="who">{{ auth.user()?.name }}</span></button>
          <mat-menu #user="matMenu">
            <div class="email" disabled>{{ auth.user()?.email }}</div>
            <a mat-menu-item routerLink="/settings/account"><mat-icon>lock</mat-icon> Change password</a>
            <button mat-menu-item type="button" (click)="auth.logout()"><mat-icon>logout</mat-icon> Log out</button>
          </mat-menu>
        </mat-toolbar>
        <main class="content"><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .container { min-height: 100vh; background: #f7f7f4; }
    .nav { width: 260px; background: #fff; border-right: 1px solid #e5e5e0; display: flex; flex-direction: column; }
    .brand { display: flex; align-items: center; gap: 10px; padding: 18px 16px 10px; }
    .brand mat-icon { color: #1b7a3d; }
    .brand div { display: flex; flex-direction: column; line-height: 1.2; }
    .brand small { color: #777; }
    .active { background: #e8f4ec; }
    .badge { background: #c62828; color: #fff !important; border-radius: 12px; padding: 2px 8px; font-size: 12px; min-width: 20px; text-align: center; }
    .foot { margin-top: auto; padding: 16px; }
    .top { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid #e5e5e0; }
    .title { font-size: 18px; margin-left: 4px; }
    .spacer { flex: 1; }
    .email { padding: 8px 16px; color: #666; font-size: 13px; }
    .content { padding: 24px; max-width: 980px; margin: 0 auto; }
    @media (max-width: 900px) { .content { padding: 14px 12px 24px; } .who { display: none; } }
  `,
})
export class Shell implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly counts = inject(CountsService);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);
  @ViewChild('nav') private nav!: MatSidenav;

  readonly mobile = toSignal(this.breakpoints.observe('(max-width: 900px)').pipe(map((r) => r.matches)), { initialValue: false });
  readonly siteHome = siteLink('/');
  private timer?: ReturnType<typeof setInterval>;

  readonly items: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/', exact: true },
    { label: 'Website pages', icon: 'article', path: '/pages' },
    { label: 'Home page sections', icon: 'home', path: '/home-sections' },
    { label: 'Services', icon: 'handyman', path: '/services' },
    { label: 'Insights (articles)', icon: 'edit_note', path: '/insights' },
    { label: 'Careers', icon: 'work', path: '/careers' },
    { label: 'Inbox', icon: 'inbox', path: '/inbox', badge: 'inbox' },
    { label: 'Settings', icon: 'settings', path: '/settings' },
  ];

  readonly unreadLabel = computed(() => this.counts.unreadTotal());

  ngOnInit() {
    this.counts.refresh();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.counts.refresh());
    this.timer = setInterval(() => this.counts.refresh(), 60_000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  closeIfMobile() {
    if (this.mobile()) this.nav.close();
  }
}
