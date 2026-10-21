import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

export interface NavCard {
  title: string;
  description?: string;
  icon: string;
  path: string;
  /** Optional small number badge (e.g. unread). */
  badge?: number;
}

/** A grid of big tappable cards, used by the landing screens (Website pages, Home sections, Settings, Dashboard). */
@Component({
  selector: 'app-nav-cards',
  imports: [RouterLink, MatCardModule, MatIconModule],
  template: `
    <div class="grid">
      @for (c of cards(); track c.path) {
        <a [routerLink]="c.path" class="link">
          <mat-card appearance="outlined" class="card">
            <mat-icon class="ico">{{ c.icon }}</mat-icon>
            <div class="text">
              <span class="title">{{ c.title }} @if (c.badge) { <span class="badge">{{ c.badge }}</span> }</span>
              @if (c.description) {
                <span class="desc">{{ c.description }}</span>
              }
            </div>
            <mat-icon class="chev">chevron_right</mat-icon>
          </mat-card>
        </a>
      }
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
    .link { text-decoration: none; color: inherit; }
    .card { display: flex; flex-direction: row; align-items: center; gap: 14px; padding: 16px; min-height: 64px; background: #fff; transition: box-shadow 0.15s; }
    .link:hover .card, .link:focus-visible .card { box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12); }
    .ico { color: #1b7a3d; flex: none; }
    .text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .title { font-weight: 500; }
    .desc { color: #666; font-size: 13px; }
    .chev { color: #aaa; flex: none; }
    .badge { background: #c62828; color: #fff; border-radius: 12px; padding: 1px 8px; font-size: 12px; margin-left: 6px; }
  `,
})
export class NavCards {
  readonly cards = input.required<NavCard[]>();
}
