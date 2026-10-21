import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { Api } from '../core/api.service';
import { NotifyService } from '../core/notify.service';
import { FieldDef, FieldType, PAGE_LISTS } from '../core/resources';
import { siteLink } from '../core/site';
import { UnsavedChangesBase } from '../core/unsaved';
import { Field } from '../shared/field';
import { PageHeader } from '../shared/page-header';
import { SeoPanel } from '../shared/seo-panel';

interface Block {
  id: number;
  blockKey: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'RICHTEXT' | 'IMAGE' | 'LINK';
  value: string;
  mediaId: number | null;
}

const TYPE_MAP: Record<Block['type'], FieldType> = { TEXT: 'textarea', TEXTAREA: 'textarea', RICHTEXT: 'richtext', IMAGE: 'image', LINK: 'link' };

/**
 * Edits one fixed page (Home, About, ...): its texts and pictures ("content blocks"), the links to the lists that
 * belong to the page, and its search-engine details.
 */
@Component({
  selector: 'app-page-editor',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, PageHeader, Field, SeoPanel],
  template: `
    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (form(); as f) {
      <app-page-header [title]="page().title" back="/pages" backLabel="Website pages">
        <a mat-stroked-button [href]="siteUrl()" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> View on website</a>
      </app-page-header>

      @if (lists.length) {
        <mat-card appearance="outlined" class="lists">
          <mat-card-header><mat-card-title>Lists and sections on this page</mat-card-title><mat-card-subtitle>Open one to add, change, reorder or hide its items.</mat-card-subtitle></mat-card-header>
          <mat-card-content class="chips">
            @for (l of lists; track l.path) {
              <a mat-stroked-button [routerLink]="l.path"><mat-icon>{{ l.icon }}</mat-icon> {{ l.label }}</a>
            }
          </mat-card-content>
        </mat-card>
      }

      <form [formGroup]="f" (ngSubmit)="save()" novalidate>
        @if (blockFields().length) {
          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>Texts and pictures</mat-card-title><mat-card-subtitle>Words inside [[double square brackets]] are shown highlighted in gold.</mat-card-subtitle></mat-card-header>
            <mat-card-content>
              @for (b of blockFields(); track b.key) {
                <app-field [def]="b" [control]="ctl(b.key)" />
              }
            </mat-card-content>
          </mat-card>
        }

        <mat-card appearance="outlined" class="name">
          <mat-card-content>
            <app-field [def]="titleDef" [control]="ctl('title')" />
          </mat-card-content>
        </mat-card>
        <app-seo-panel [form]="f" kind="page" [pageKey]="key" titleKey="title" />

        <div class="bar">
          <button mat-button type="button" (click)="cancel()">{{ f.dirty ? 'Cancel' : 'Close' }}</button>
          <button mat-flat-button type="submit" [disabled]="saving()">
            @if (saving()) {
              <mat-spinner diameter="20" />
            } @else {
              <mat-icon>save</mat-icon>
            }
            Save changes
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    .center { display: flex; justify-content: center; padding: 48px; }
    mat-card { margin-bottom: 16px; }
    mat-card-content { padding-top: 16px; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .name { margin-top: 20px; }
    .bar { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 0; background: linear-gradient(to top, #f7f7f4 70%, rgba(247, 247, 244, 0)); z-index: 5; }
  `,
})
export class PageEditor extends UnsavedChangesBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);

  key = '';
  lists: { label: string; path: string; icon: string }[] = [];
  readonly titleDef: FieldDef = { key: 'title', label: 'Page name', type: 'text', required: true, max: 200, hint: 'Used in the browser tab title, for example “About Us — Your Business”.' };
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly form = signal<FormGroup | null>(null);
  readonly page = signal<any>({});
  readonly blockFields = signal<FieldDef[]>([]);
  private blocks: Block[] = [];

  hasUnsavedChanges() {
    return !!this.form()?.dirty;
  }

  siteUrl() {
    return siteLink(this.page().viewUrl ?? '/');
  }

  ctl(key: string): FormControl {
    return this.form()!.controls[key] as FormControl;
  }

  async ngOnInit() {
    this.key = this.route.snapshot.paramMap.get('key')!;
    this.lists = PAGE_LISTS[this.key] ?? [];
    try {
      const [pages, blocks] = await Promise.all([
        firstValueFrom(this.api.get<any[]>('/pages')),
        firstValueFrom(this.api.get<Block[]>('/content-blocks', { pageKey: this.key })),
      ]);
      const page = pages.find((p) => p.key === this.key);
      if (!page) throw new Error('unknown page');
      this.page.set(page);
      this.blocks = blocks;
      this.blockFields.set(blocks.map((b) => this.fieldFor(b)));
      this.build(page, blocks);
    } catch (e) {
      this.notify.error(e);
      this.router.navigateByUrl('/pages');
    } finally {
      this.loading.set(false);
    }
  }

  private fieldFor(b: Block): FieldDef {
    const type = TYPE_MAP[b.type];
    const highlight = b.value?.includes('[[');
    return {
      key: `b${b.id}`, label: b.label, type,
      rows: type === 'textarea' ? (b.type === 'TEXTAREA' || b.value.length > 120 ? 4 : highlight || b.value.includes('\n') ? 2 : 1) : undefined,
      hint: type === 'textarea' && b.value.includes('\n') ? 'A new line here is a line break on the website.' : undefined,
      required: false,
      // The RICHTEXT blocks hold formatted HTML; image blocks hold a picture.
    };
  }

  private build(page: any, blocks: Block[]) {
    const c: Record<string, FormControl> = {
      title: new FormControl(page.title, [Validators.required, Validators.maxLength(200)]),
      metaTitle: new FormControl(page.metaTitle ?? '', [Validators.maxLength(200)]),
      metaDescription: new FormControl(page.metaDescription ?? '', [Validators.maxLength(400)]),
      ogImageId: new FormControl(page.ogImageId ?? null),
    };
    for (const b of blocks) c[`b${b.id}`] = new FormControl(b.type === 'IMAGE' ? b.mediaId : b.value);
    this.form.set(new FormGroup(c));
  }

  async save() {
    const f = this.form()!;
    f.markAllAsTouched();
    if (f.invalid) return this.notify.error('Please fix the highlighted fields first.');
    this.saving.set(true);
    try {
      const v = f.getRawValue();
      const jobs: Promise<unknown>[] = [
        firstValueFrom(this.api.patch(`/pages/${this.page().id}`, { title: v['title'], metaTitle: v['metaTitle'] ?? '', metaDescription: v['metaDescription'] ?? '', ogImageId: v['ogImageId'] || null })),
      ];
      for (const b of this.blocks) {
        const ctl = f.controls[`b${b.id}`];
        if (!ctl.dirty) continue;
        jobs.push(firstValueFrom(this.api.patch(`/content-blocks/${b.id}`, b.type === 'IMAGE' ? { mediaId: ctl.value || null } : { value: ctl.value ?? '' })));
      }
      await Promise.all(jobs);
      f.markAsPristine();
      this.page.update((p) => ({ ...p, title: v['title'] }));
      this.notify.success('Saved');
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  async cancel() {
    await this.router.navigateByUrl('/pages');
  }
}
