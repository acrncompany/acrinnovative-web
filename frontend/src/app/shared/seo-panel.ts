import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import { Api } from '../core/api.service';
import { ImageField } from './image-field';

interface Preview {
  title: string;
  description: string;
  url: string;
  titleLength: number;
  descriptionLength: number;
  titleTarget: number;
  descriptionTarget: number;
}

/**
 * "Search engines & sharing" panel, shown under every content form.
 * Expects the form to have the controls: metaTitle, metaDescription, ogImageId (+ slug for services / articles / jobs).
 * The Google preview comes from the server (/seo/preview), which applies the SAME rules as the public website.
 */
@Component({
  selector: 'app-seo-panel',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, ImageField],
  template: `
    <mat-card appearance="outlined" class="seo">
      <mat-card-header>
        <mat-card-title>Search engines &amp; sharing</mat-card-title>
        <mat-card-subtitle>How this page appears on Google and when shared on WhatsApp, LinkedIn or Facebook.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (preview(); as p) {
          <div class="serp" aria-label="Google preview">
            <div class="url">{{ p.url }}</div>
            <div class="t">{{ p.title }}</div>
            <div class="d">{{ p.description }}</div>
          </div>
        }

        @if (hasSlug()) {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Web address</mat-label>
            <input matInput [formControl]="ctl('slug')" maxlength="270" placeholder="Created from the title" />
            <mat-hint>Created from the title automatically. Change it only if you need to. Use letters, numbers and dashes.</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full">
          <mat-label>Page title for Google</mat-label>
          <input matInput [formControl]="ctl('metaTitle')" maxlength="200" [placeholder]="preview()?.title ?? ''" />
          <mat-hint [class.over]="titleLen() > 60">{{ titleLen() }} / 60 characters{{ titleLen() === 0 ? ' · leave empty to use the automatic title shown above' : titleLen() > 60 ? ' · a bit long, Google may cut it' : '' }}</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Description for Google</mat-label>
          <textarea matInput [formControl]="ctl('metaDescription')" rows="3" maxlength="400" [placeholder]="preview()?.description ?? ''"></textarea>
          <mat-hint [class.over]="descLen() > 160">{{ descLen() }} / 160 characters{{ descLen() === 0 ? ' · leave empty to use the automatic text' : descLen() > 160 ? ' · a bit long, Google may cut it' : '' }}</mat-hint>
        </mat-form-field>

        <app-image-field [control]="imageCtl()" label="Picture when shared" hint="Shown when the page link is shared. If empty, the default sharing picture from Settings is used." />
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .seo { margin-top: 20px; }
    .full { width: 100%; margin-top: 8px; }
    .serp { border: 1px solid #dadce0; border-radius: 8px; padding: 12px 14px; margin: 12px 0 8px; background: #fff; max-width: 640px; }
    .serp .url { color: #1e7a34; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .serp .t { color: #1a0dab; font-size: 19px; line-height: 1.3; margin: 2px 0; }
    .serp .d { color: #4d5156; font-size: 14px; line-height: 1.5; }
    .over { color: #b26a00; }
  `,
})
export class SeoPanel implements OnInit {
  readonly form = input.required<FormGroup>();
  readonly kind = input.required<'page' | 'service' | 'post' | 'job'>();
  /** For fixed pages: home, about, ... */
  readonly pageKey = input('');
  /** Form control holding the item's title / the field used as fallback description. */
  readonly titleKey = input('title');
  readonly textKey = input('');
  readonly hasSlug = input(false);

  private readonly api = inject(Api);
  private readonly destroyRef = inject(DestroyRef);
  readonly preview = signal<Preview | null>(null);
  readonly titleLen = signal(0);
  readonly descLen = signal(0);

  ctl(name: string): FormControl {
    return this.form().controls[name] as FormControl;
  }

  imageCtl(): FormControl<number | null> {
    return this.form().controls['ogImageId'] as FormControl<number | null>;
  }

  ngOnInit() {
    const f = this.form();
    const names = ['metaTitle', 'metaDescription', 'slug', this.titleKey(), this.textKey()].filter((n) => n && f.controls[n]);
    const lengths = () => {
      this.titleLen.set(((f.controls['metaTitle']?.value as string) ?? '').length);
      this.descLen.set(((f.controls['metaDescription']?.value as string) ?? '').length);
    };
    lengths();
    merge(...names.map((n) => f.controls[n].valueChanges))
      .pipe(startWith(null), tap(lengths), debounceTime(250), switchMap(() => {
        return this.api
          .post<Preview>('/seo/preview', {
            kind: this.kind(),
            pageKey: this.pageKey() || undefined,
            title: f.controls[this.titleKey()]?.value || undefined,
            metaTitle: f.controls['metaTitle']?.value || undefined,
            metaDescription: f.controls['metaDescription']?.value || undefined,
            slug: f.controls['slug']?.value || undefined,
            text: this.textKey() ? f.controls[this.textKey()]?.value || undefined : undefined,
          })
          .pipe(catchError(() => of(null)));
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => this.preview.set(p));
  }
}
