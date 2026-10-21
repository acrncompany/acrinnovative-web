import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { Api } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { iconByClass, iconChar } from '../../core/icons';
import { NotifyService } from '../../core/notify.service';
import { RESOURCES, ResourceConfig } from '../../core/resources';
import { PageHeader } from '../../shared/page-header';

interface Group {
  title: string;
  items: any[];
}

/**
 * Generic list screen. Everything (columns, filters, ordering...) comes from the resource description in core/resources.ts.
 * Rows can be re-ordered (drag handle or arrows), published/hidden and deleted (with confirmation).
 */
@Component({
  selector: 'app-resource-list',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, RouterLink, MatButtonModule, MatButtonToggleModule, MatCardModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, MatSelectModule, PageHeader],
  template: `
    <app-page-header [title]="config.title" [help]="config.help ?? ''" [back]="config.backPath ?? ''" [backLabel]="config.backLabel ?? ''">
      @for (l of config.links ?? []; track l.path) {
        <a mat-stroked-button [routerLink]="l.path"><mat-icon>{{ l.icon }}</mat-icon> {{ l.label }}</a>
      }
      <a mat-flat-button [routerLink]="config.basePath + '/new'"><mat-icon>add</mat-icon> Add {{ config.singular }}</a>
    </app-page-header>

    @if (config.list.filter === 'status') {
      <mat-button-toggle-group class="filter" [value]="statusFilter()" (change)="setStatus($event.value)" aria-label="Show">
        <mat-button-toggle value="">All</mat-button-toggle>
        <mat-button-toggle value="PUBLISHED">Visible</mat-button-toggle>
        <mat-button-toggle value="DRAFT">Hidden</mat-button-toggle>
      </mat-button-toggle-group>
    }
    @if (config.list.filter === 'serviceCategory' || config.list.filter === 'postCategory') {
      <mat-form-field appearance="outline" class="filter-select" subscriptSizing="dynamic">
        <mat-label>Show</mat-label>
        <mat-select [value]="categoryFilter()" (selectionChange)="setCategory($event.value)">
          <mat-option [value]="0">All groups</mat-option>
          @for (c of categories(); track c.id) {
            <mat-option [value]="c.id">{{ c.title ?? c.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    }

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (items().length === 0) {
      <mat-card appearance="outlined" class="empty">
        <mat-card-content>
          <mat-icon>inbox</mat-icon>
          <p>{{ filtered() ? 'Nothing matches this filter.' : config.list.emptyText }}</p>
        </mat-card-content>
      </mat-card>
    } @else {
      @if (config.list.sortable && filtered()) {
        <p class="note">Ordering is switched off while a filter is active. Choose “All” to change the order.</p>
      }
      @for (g of groups(); track g.title) {
        @if (g.title) {
          <h2 class="group">{{ g.title }}</h2>
        }
        <div cdkDropList [cdkDropListDisabled]="!canReorder()" (cdkDropListDropped)="dropped($event, g)" class="rows">
          @for (r of g.items; track r.id; let i = $index; let first = $first; let last = $last) {
            <mat-card appearance="outlined" class="row" cdkDrag [cdkDragDisabled]="!canReorder()" [class.hidden-item]="config.list.hasStatus && r.status === 'DRAFT'">
              @if (canReorder()) {
                <mat-icon class="handle" cdkDragHandle aria-label="Drag to reorder">drag_indicator</mat-icon>
              }
              <a class="main" [routerLink]="config.basePath + '/' + r.id">
                @if (config.list.thumb?.(r); as path) {
                  <img class="thumb" [src]="'/uploads/' + path" alt="" loading="lazy" />
                } @else if (glyph(r); as ch) {
                  <span class="glyph-box" aria-hidden="true"><span class="glyph">{{ ch }}</span></span>
                }
                <span class="text">
                  <span class="primary">{{ config.list.primary(r) }}</span>
                  @if (config.list.secondary?.(r); as s) {
                    <span class="secondary">{{ s }}</span>
                  }
                </span>
              </a>
              @if (config.list.hasStatus) {
                <mat-chip [class.chip-on]="r.status === 'PUBLISHED'" [class.chip-off]="r.status !== 'PUBLISHED'" disableRipple>{{ r.status === 'PUBLISHED' ? 'Visible' : 'Hidden' }}</mat-chip>
              }
              @if (canReorder()) {
                <span class="arrows">
                  <button mat-icon-button type="button" (click)="move(g, i, -1)" [disabled]="first" aria-label="Move up"><mat-icon>keyboard_arrow_up</mat-icon></button>
                  <button mat-icon-button type="button" (click)="move(g, i, 1)" [disabled]="last" aria-label="Move down"><mat-icon>keyboard_arrow_down</mat-icon></button>
                </span>
              }
              <button mat-icon-button type="button" [matMenuTriggerFor]="menu" aria-label="More actions"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menu="matMenu">
                <a mat-menu-item [routerLink]="config.basePath + '/' + r.id"><mat-icon>edit</mat-icon> Edit</a>
                @if (config.list.hasStatus) {
                  <button mat-menu-item type="button" (click)="toggle(r)">
                    <mat-icon>{{ r.status === 'PUBLISHED' ? 'visibility_off' : 'visibility' }}</mat-icon> {{ r.status === 'PUBLISHED' ? 'Hide from website' : 'Show on website' }}
                  </button>
                }
                @if (!config.noDelete) {
                  <button mat-menu-item type="button" (click)="remove(r)"><mat-icon>delete</mat-icon> Delete</button>
                }
              </mat-menu>
            </mat-card>
          }
        </div>
      }
    }
  `,
  styles: `
    .center { display: flex; justify-content: center; padding: 48px; }
    .filter { margin-bottom: 16px; }
    .filter-select { width: 260px; max-width: 100%; margin-bottom: 12px; }
    .note { color: #666; font-size: 13px; margin: 0 0 8px; }
    .group { font-size: 16px; font-weight: 500; color: #8a6a1f; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    .rows { display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 6px 6px 6px 8px; background: #fff; }
    .row.hidden-item { background: #fafafa; }
    .row.hidden-item .text { opacity: 0.65; }
    .handle { cursor: grab; color: #999; flex: none; touch-action: none; }
    .main { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; text-decoration: none; color: inherit; padding: 6px 4px; min-height: 52px; }
    .thumb { width: 64px; height: 44px; object-fit: cover; border-radius: 6px; background: #eee; flex: none; }
    .glyph-box { width: 44px; height: 44px; border-radius: 10px; background: #f1ede2; display: grid; place-items: center; flex: none; }
    .glyph { font-family: 'FAS'; font-weight: 900; font-size: 18px; color: #8a6a1f; }
    .text { display: flex; flex-direction: column; min-width: 0; }
    .primary { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .secondary { color: #666; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .chip-on { --mdc-chip-elevated-container-color: #dff2e5; --mat-chip-elevated-container-color: #dff2e5; }
    .chip-off { --mdc-chip-elevated-container-color: #eee; --mat-chip-elevated-container-color: #eee; }
    .arrows { display: flex; flex: none; }
    .empty { text-align: center; padding: 24px 8px; color: #666; }
    .empty mat-icon { font-size: 40px; width: 40px; height: 40px; color: #aaa; }
    .cdk-drag-preview { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25); border-radius: 8px; }
    .cdk-drag-placeholder { opacity: 0.3; }
    @media (max-width: 600px) {
      .handle { display: none; } /* dragging is fiddly on touch screens: use the arrows */
      .arrows button { width: 40px; }
      mat-chip { display: none; }
      .primary { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .secondary { -webkit-line-clamp: 1; }
    }
  `,
})
export class ResourceList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);

  config!: ResourceConfig;
  readonly loading = signal(true);
  readonly items = signal<any[]>([]);
  readonly statusFilter = signal('');
  readonly categoryFilter = signal(0);
  readonly categories = signal<any[]>([]);

  readonly filtered = computed(() => !!this.statusFilter() || this.categoryFilter() > 0);
  readonly canReorder = computed(() => !!this.config?.list.sortable && !this.filtered());
  readonly groups = computed<Group[]>(() => {
    const groupBy = this.config?.list.groupBy;
    if (!groupBy) return [{ title: '', items: this.items() }];
    const map = new Map<string, any[]>();
    for (const r of this.items()) {
      const k = groupBy(r);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map].map(([title, items]) => ({ title, items }));
  });

  ngOnInit() {
    this.config = RESOURCES[this.route.snapshot.data['resource']];
    const f = this.config.list.filter;
    if (f === 'serviceCategory' || f === 'postCategory') {
      firstValueFrom(this.api.get(f === 'serviceCategory' ? '/service-categories' : '/post-categories')).then((c) => this.categories.set(c)).catch(() => undefined);
    }
    this.load();
  }

  glyph(r: any): string | null {
    const cls = this.config.list.icon?.(r);
    const i = iconByClass(cls);
    return i ? iconChar(i.code) : null;
  }

  async load() {
    this.loading.set(true);
    try {
      const query: Record<string, unknown> = { ...this.config.fixed };
      if (this.statusFilter()) query['status'] = this.statusFilter();
      if (this.categoryFilter()) query['categoryId'] = this.categoryFilter();
      this.items.set(await firstValueFrom(this.api.get<any[]>(this.config.endpoint, query)));
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  setStatus(v: string) {
    this.statusFilter.set(v);
    this.load();
  }

  setCategory(v: number) {
    this.categoryFilter.set(v);
    this.load();
  }

  dropped(event: CdkDragDrop<unknown>, group: Group) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(group.items, event.previousIndex, event.currentIndex);
    this.saveOrder(group);
  }

  move(group: Group, index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= group.items.length) return;
    moveItemInArray(group.items, index, to);
    this.saveOrder(group);
  }

  private async saveOrder(group: Group) {
    // Write the group's new order back into the full list (the group's rows keep the slots they occupied).
    this.items.update((list) => {
      const ids = new Set(group.items.map((r) => r.id));
      const slots = group.items.slice();
      return list.map((x) => (ids.has(x.id) ? slots.shift() : x));
    });
    try {
      await firstValueFrom(this.api.put(`${this.config.endpoint}/reorder`, { ids: group.items.map((r) => r.id) }));
      this.notify.success('Order saved');
    } catch (e) {
      this.notify.error(e);
      this.load();
    }
  }

  async toggle(r: any) {
    const status = r.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const updated = await firstValueFrom(this.api.patch(`${this.config.endpoint}/${r.id}`, { status }));
      this.items.update((list) => list.map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
      this.notify.success(status === 'PUBLISHED' ? 'Now visible on the website' : 'Now hidden from the website');
    } catch (e) {
      this.notify.error(e);
    }
  }

  async remove(r: any) {
    const name = this.config.list.primary(r) || `this ${this.config.singular}`;
    const ok = await this.confirm.ask({
      title: `Delete ${this.config.singular}?`,
      message: `“${name}” will be permanently deleted. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(`${this.config.endpoint}/${r.id}`));
      this.items.update((list) => list.filter((x) => x.id !== r.id));
      this.notify.success('Deleted');
    } catch (e) {
      this.notify.error(e);
    }
  }
}
