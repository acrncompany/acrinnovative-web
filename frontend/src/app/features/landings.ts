import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { Api } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { NotifyService } from '../core/notify.service';
import { PAGE_LISTS } from '../core/resources';
import { siteLink } from '../core/site';
import { NavCard, NavCards } from '../shared/nav-cards';
import { PageHeader } from '../shared/page-header';

/** Simple menu screens made of big cards: Website pages, Home sections, Settings. */
const PAGE_BLURBS: Record<string, string> = {
  home: 'Texts, headings and search-engine details of the home page',
  about: 'Introduction, mission and the leadership section',
  'how-we-work': 'The engagement process steps',
  services: 'The heading and intro of the Services page',
  insights: 'The heading and intro of the Insights page',
  careers: 'The Careers page text and how to apply',
  contact: 'The Contact page text and form messages',
};
const PAGE_ICONS: Record<string, string> = { home: 'home', about: 'info', 'how-we-work': 'account_tree', services: 'handyman', insights: 'edit_note', careers: 'work', contact: 'contact_mail' };

@Component({
  selector: 'app-pages-landing',
  imports: [PageHeader, NavCards, MatProgressSpinnerModule],
  template: `
    <app-page-header title="Website pages" help="Choose a page to change its texts, pictures and how it appears on Google." />
    @if (cards().length) {
      <app-nav-cards [cards]="cards()" />
    } @else {
      <mat-spinner diameter="36" />
    }
  `,
})
export class PagesLanding implements OnInit {
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);
  readonly cards = signal<NavCard[]>([]);

  async ngOnInit() {
    try {
      const pages = await firstValueFrom(this.api.get<{ key: string; title: string }[]>('/pages'));
      this.cards.set(pages.map((p) => ({ title: p.title, description: PAGE_BLURBS[p.key], icon: PAGE_ICONS[p.key] ?? 'article', path: `/pages/${p.key}` })));
    } catch (e) {
      this.notify.error(e);
    }
  }
}

@Component({
  selector: 'app-home-sections',
  imports: [PageHeader, NavCards],
  template: `
    <app-page-header title="Home page sections" help="The home page is made of these sections. Choose one to change it." />
    <app-nav-cards [cards]="cards" />
  `,
})
export class HomeSections {
  readonly cards: NavCard[] = [
    { title: 'Headings, texts & Google details', description: 'Section titles, buttons and the home page search listing', icon: 'edit', path: '/pages/home' },
    ...PAGE_LISTS['home'].map((l) => ({ title: l.label, icon: l.icon, path: l.path })),
    { title: 'Latest articles on the home page', description: 'Choose which articles appear (“Show on the home page”)', icon: 'article', path: '/insights' },
  ];
}

@Component({
  selector: 'app-settings-landing',
  imports: [PageHeader, NavCards],
  template: `
    <app-page-header title="Settings" />
    <app-nav-cards [cards]="cards" />
  `,
})
export class SettingsLanding {
  readonly cards: NavCard[] = [
    { title: 'Business details', description: 'Name, logos, browser icon, email, footer text, Google defaults', icon: 'business', path: '/settings/general' },
    { title: 'Offices', description: 'Addresses and phone numbers (footer, Contact page, Google)', icon: 'location_on', path: '/settings/offices' },
    { title: 'Top menu', description: 'The links at the top of every page', icon: 'menu', path: '/settings/menu-header' },
    { title: 'Footer menu', description: 'The links at the bottom of every page', icon: 'view_list', path: '/settings/menu-footer' },
    { title: 'Social media links', description: 'LinkedIn, Facebook, Instagram…', icon: 'share', path: '/settings/social' },
    { title: 'Pictures', description: 'All uploaded pictures; add, describe or delete', icon: 'photo_library', path: '/settings/images' },
    { title: 'My account', description: 'Change your password', icon: 'lock', path: '/settings/account' },
  ];
}

interface Dashboard {
  unreadMessages: number;
  unreadApplications: number;
  draftPosts: number;
  publishedPosts: number;
  draftJobs: number;
  publishedJobs: number;
  services: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [MatButtonModule, MatCardModule, MatIconModule, PageHeader, NavCards, MatProgressSpinnerModule],
  template: `
    <app-page-header [title]="'Welcome, ' + (auth.user()?.name || 'there')" help="Here is what needs your attention and the most common tasks." />
    @if (data(); as d) {
      @if (attention().length) {
        <h2 class="h">Needs your attention</h2>
        <app-nav-cards [cards]="attention()" />
      } @else {
        <mat-card appearance="outlined" class="ok"><mat-card-content><mat-icon>check_circle</mat-icon> Everything is up to date. Nothing is waiting for you.</mat-card-content></mat-card>
      }

      <h2 class="h">Common tasks</h2>
      <app-nav-cards [cards]="tasks" />

      <h2 class="h">Your website</h2>
      <div class="stats">
        <div><strong>{{ d.publishedPosts }}</strong><span>articles published</span></div>
        <div><strong>{{ d.services }}</strong><span>services shown</span></div>
        <div><strong>{{ d.publishedJobs }}</strong><span>job openings</span></div>
      </div>
      <a mat-stroked-button [href]="home" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> Open the website</a>
    } @else {
      <mat-spinner diameter="36" />
    }
  `,
  styles: `
    .h { font-size: 16px; font-weight: 500; margin: 28px 0 10px; color: #444; }
    .ok mat-card-content { display: flex; align-items: center; gap: 10px; color: #1b7a3d; padding: 16px; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .stats div { background: #fff; border: 1px solid #e5e5e0; border-radius: 12px; padding: 14px 20px; display: flex; flex-direction: column; min-width: 130px; }
    .stats strong { font-size: 26px; font-weight: 500; }
    .stats span { color: #666; font-size: 13px; }
  `,
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);
  readonly data = signal<Dashboard | null>(null);
  readonly attention = signal<NavCard[]>([]);
  readonly home = siteLink('/');

  readonly tasks: NavCard[] = [
    { title: 'Write a new article', icon: 'edit_note', path: '/insights/new' },
    { title: 'Add a service', icon: 'add_business', path: '/services/new' },
    { title: 'Add a job opening', icon: 'person_add', path: '/careers/new' },
    { title: 'Change the home page slideshow', icon: 'slideshow', path: '/lists/slides' },
    { title: 'Upload a picture', icon: 'add_photo_alternate', path: '/settings/images' },
  ];

  async ngOnInit() {
    try {
      const d = await firstValueFrom(this.api.get<Dashboard>('/dashboard'));
      this.data.set(d);
      const cards: NavCard[] = [];
      if (d.unreadMessages) cards.push({ title: `${d.unreadMessages} new message${d.unreadMessages > 1 ? 's' : ''}`, description: 'From the Contact form', icon: 'mail', path: '/inbox/messages' });
      if (d.unreadApplications) cards.push({ title: `${d.unreadApplications} new job application${d.unreadApplications > 1 ? 's' : ''}`, description: 'With CVs to download', icon: 'description', path: '/inbox/applications' });
      if (d.draftPosts) cards.push({ title: `${d.draftPosts} hidden article${d.draftPosts > 1 ? 's' : ''}`, description: 'Drafts not yet on the website', icon: 'edit_note', path: '/insights' });
      this.attention.set(cards);
    } catch (e) {
      this.notify.error(e);
    }
  }
}
