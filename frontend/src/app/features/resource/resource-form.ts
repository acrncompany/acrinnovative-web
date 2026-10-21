import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { NotifyService } from '../../core/notify.service';
import { FieldDef, RESOURCES, ResourceConfig } from '../../core/resources';
import { siteLink } from '../../core/site';
import { UnsavedChangesBase } from '../../core/unsaved';
import { Field } from '../../shared/field';
import { PageHeader } from '../../shared/page-header';
import { SeoPanel } from '../../shared/seo-panel';

type Option = { value: string | number | boolean; label: string };
const LINK_PATTERN = /^(\/|#|https?:\/\/|mailto:|tel:)/;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** ISO date -> value for <input type="datetime-local"> in the visitor's own time zone. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Generic create / edit screen built from the resource description in core/resources.ts:
 * fields, validation, SEO panel, save, delete, "view on site", and the "unsaved changes" warning.
 */
@Component({
  selector: 'app-resource-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, PageHeader, Field, SeoPanel],
  template: `
    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (form(); as f) {
      <app-page-header [title]="title()" [help]="isNew() ? '' : (config.help ?? '')" [back]="config.backPath ?? config.basePath" [backLabel]="config.backLabel ?? config.title">
        @if (viewUrl(); as u) {
          <a mat-stroked-button [href]="u" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> View on website</a>
        } @else if (!isNew() && config.seo && item()?.status === 'DRAFT') {
          <span class="draft-note"><mat-icon>visibility_off</mat-icon> Hidden: not on the website yet</span>
        }
        @if (!isNew() && !config.noDelete && !config.singleton) {
          <button mat-stroked-button type="button" class="danger-outline" (click)="remove()"><mat-icon>delete</mat-icon> Delete</button>
        }
      </app-page-header>

      <form [formGroup]="f" (ngSubmit)="save()" novalidate>
        <mat-card appearance="outlined">
          <mat-card-content>
            @for (d of visibleFields(); track d.key) {
              @if (d.section) {
                <h2 class="section">{{ d.section }}</h2>
              }
              <app-field [def]="d" [control]="ctl(d.key)" [options]="optionsFor(d)" />
            }
          </mat-card-content>
        </mat-card>

        @if (config.seo; as seo) {
          <app-seo-panel [form]="f" [kind]="seo.kind" [titleKey]="seo.titleKey" [textKey]="seo.textKey" [hasSlug]="true" />
        }

        <div class="bar">
          <button mat-button type="button" (click)="cancel()">{{ f.dirty ? 'Cancel' : 'Close' }}</button>
          <button mat-flat-button type="submit" [disabled]="saving()">
            @if (saving()) {
              <mat-spinner diameter="20" />
            } @else {
              <mat-icon>save</mat-icon>
            }
            {{ isNew() ? 'Create' : 'Save changes' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    .center { display: flex; justify-content: center; padding: 48px; }
    .section { font-size: 15px; font-weight: 500; color: #8a6a1f; text-transform: uppercase; letter-spacing: 0.04em; margin: 24px 0 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
    mat-card-content { padding-top: 16px; }
    .bar { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 0; margin-top: 16px; background: linear-gradient(to top, #f7f7f4 70%, rgba(247, 247, 244, 0)); z-index: 5; }
    .draft-note { display: inline-flex; align-items: center; gap: 6px; color: #666; font-size: 14px; }
    .danger-outline { color: #b3261e; }
  `,
})
export class ResourceForm extends UnsavedChangesBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);

  config!: ResourceConfig;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly form = signal<FormGroup | null>(null);
  readonly item = signal<any | null>(null);
  readonly options = signal<Record<string, Option[]>>({});
  /** Current values, as a signal, so "show only if..." fields react while typing. */
  private readonly values = signal<Record<string, any>>({});
  private id: string | null = null;

  readonly isNew = computed(() => !this.config.singleton && !this.item());
  readonly visibleFields = computed(() => this.config.fields.filter((f) => !f.showIf || f.showIf(this.values())));
  readonly title = computed(() => {
    if (this.config.singleton) return this.config.title;
    const i = this.item();
    return i ? this.config.list.primary(i) || `Edit ${this.config.singular}` : `Add ${this.config.singular}`;
  });
  readonly viewUrl = computed(() => {
    const i = this.item();
    return i?.viewUrl && (i.status === undefined || i.status === 'PUBLISHED') ? siteLink(i.viewUrl) : null;
  });

  hasUnsavedChanges() {
    return !!this.form()?.dirty;
  }

  async ngOnInit() {
    this.config = RESOURCES[this.route.snapshot.data['resource']];
    this.id = this.route.snapshot.paramMap.get('id');
    try {
      await this.loadOptions();
      const item = this.config.singleton
        ? await firstValueFrom(this.api.get(this.config.endpoint))
        : this.id
          ? await firstValueFrom(this.api.get(`${this.config.endpoint}/${this.id}`))
          : null;
      this.item.set(item);
      this.buildForm(item);
    } catch (e) {
      this.notify.error(e);
      this.router.navigateByUrl(this.config.backPath ?? this.config.basePath);
    } finally {
      this.loading.set(false);
    }
  }

  ctl(key: string): FormControl {
    return this.form()!.controls[key] as FormControl;
  }

  optionsFor(d: FieldDef): Option[] {
    return d.optionsFrom ? (this.options()[d.optionsFrom] ?? []) : (d.options ?? []);
  }

  private async loadOptions() {
    const wanted = new Set(this.config.fields.map((f) => f.optionsFrom).filter(Boolean) as string[]);
    const urls: Record<string, [string, string]> = {
      serviceCategories: ['/service-categories', 'title'],
      postCategories: ['/post-categories', 'name'],
    };
    const loaded: Record<string, Option[]> = {};
    for (const key of wanted) {
      const rows = await firstValueFrom(this.api.get<any[]>(urls[key][0]));
      loaded[key] = rows.map((r) => ({ value: r.id, label: r[urls[key][1]] }));
    }
    this.options.set(loaded);
  }

  private validators(d: FieldDef): ValidatorFn[] {
    const v: ValidatorFn[] = [];
    if (d.required && d.type !== 'bool') v.push(Validators.required);
    if (d.max && d.type !== 'richtext' && d.type !== 'number') v.push(Validators.maxLength(d.max));
    if (d.type === 'link') v.push(Validators.pattern(LINK_PATTERN));
    if (d.type === 'email') v.push(Validators.email);
    if (d.type === 'color') v.push(Validators.pattern(HEX));
    if (d.type === 'number') v.push(Validators.min(0));
    return v;
  }

  private initialValue(d: FieldDef, item: any): any {
    const defaults = this.config.defaults ?? {};
    let raw = item ? item[d.key] : defaults[d.key];
    if (raw === undefined) {
      if (d.type === 'select' && d.optionsFrom) raw = this.options()[d.optionsFrom]?.[0]?.value ?? null;
      else if (d.type === 'status') raw = 'PUBLISHED';
    }
    switch (d.type) {
      case 'bool': return !!raw;
      case 'number': case 'image': return raw ?? null;
      case 'datetime': return toLocalInput(raw);
      case 'color': return raw || '#C89B42';
      default: return raw ?? '';
    }
  }

  private buildForm(item: any) {
    const controls: Record<string, FormControl> = {};
    for (const d of this.config.fields) controls[d.key] = new FormControl(this.initialValue(d, item), this.validators(d));
    if (this.config.seo) {
      controls['metaTitle'] = new FormControl(item?.metaTitle ?? '', [Validators.maxLength(200)]);
      controls['metaDescription'] = new FormControl(item?.metaDescription ?? '', [Validators.maxLength(400)]);
      controls['slug'] = new FormControl(item?.slug ?? '', [Validators.maxLength(270)]);
      controls['ogImageId'] = new FormControl(item?.ogImageId ?? null);
    }
    const form = new FormGroup(controls);
    this.values.set(form.getRawValue());
    form.valueChanges.subscribe(() => this.values.set(form.getRawValue()));
    this.form.set(form);
  }

  /** Form values -> what the API expects (empty optional fields become null, dates become ISO strings, ...). */
  private payload(): Record<string, unknown> {
    const raw = this.form()!.getRawValue();
    const out: Record<string, unknown> = {};
    for (const d of this.config.fields) {
      const v = raw[d.key];
      switch (d.type) {
        case 'number':
          // An empty number is left out (the saved value stays), unless the field may really be emptied (clearable).
          if (v !== null && v !== '') out[d.key] = Number(v);
          else if (d.clearable) out[d.key] = null;
          break;
        case 'datetime':
          if (v) out[d.key] = new Date(v).toISOString();
          else if (d.clearable) out[d.key] = null;
          break;
        case 'image': out[d.key] = v || null; break;
        case 'link': case 'email': out[d.key] = d.required ? v : v || null; break;
        default: out[d.key] = v;
      }
    }
    if (this.config.seo) {
      for (const k of ['metaTitle', 'metaDescription', 'slug']) out[k] = raw[k] ?? '';
      out['ogImageId'] = raw['ogImageId'] || null;
    }
    if (this.isNew()) Object.assign(out, this.config.fixed ?? {});
    return out;
  }

  async save() {
    const form = this.form()!;
    form.markAllAsTouched();
    if (form.invalid) {
      this.notify.error('Please fix the highlighted fields first.');
      queueMicrotask(() => document.querySelector('.mat-form-field-invalid, .mat-mdc-form-field-error, .ng-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    this.saving.set(true);
    try {
      if (this.config.singleton) {
        const saved = await firstValueFrom(this.api.patch(this.config.endpoint, this.payload()));
        this.item.set(saved);
        form.markAsPristine();
        this.notify.success('Saved');
      } else if (this.isNew()) {
        const created = await firstValueFrom(this.api.post(this.config.endpoint, this.payload()));
        form.markAsPristine();
        this.notify.success('Created');
        await this.router.navigateByUrl(`${this.config.basePath}/${created.id}`, { replaceUrl: true });
      } else {
        const saved = await firstValueFrom(this.api.patch(`${this.config.endpoint}/${this.id}`, this.payload()));
        this.item.set(saved);
        this.refreshFrom(saved);
        form.markAsPristine();
        this.notify.success('Saved');
      }
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  /** After saving, show what the server actually stored (e.g. a cleaned-up web address). */
  private refreshFrom(saved: any) {
    const form = this.form()!;
    for (const d of this.config.fields) if (d.type === 'datetime') form.controls[d.key].setValue(toLocalInput(saved[d.key]), { emitEvent: false });
    if (this.config.seo) form.controls['slug'].setValue(saved.slug ?? '', { emitEvent: true });
  }

  async cancel() {
    // The "unsaved changes" guard asks for confirmation if needed.
    await this.router.navigateByUrl(this.config.backPath ?? this.config.basePath);
  }

  async remove() {
    const ok = await this.confirm.ask({
      title: `Delete ${this.config.singular}?`,
      message: `“${this.title()}” will be permanently deleted. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(`${this.config.endpoint}/${this.id}`));
      this.form()!.markAsPristine();
      this.notify.success('Deleted');
      await this.router.navigateByUrl(this.config.backPath ?? this.config.basePath);
    } catch (e) {
      this.notify.error(e);
    }
  }
}
