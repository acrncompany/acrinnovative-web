import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, firstValueFrom } from 'rxjs';
import { ConfirmService } from '../core/confirm.service';
import { Media, MediaService, MediaUsage } from '../core/media.service';
import { NotifyService } from '../core/notify.service';
import { PageHeader } from '../shared/page-header';
import { UploadForm } from '../shared/upload-form';

@Component({
  selector: 'app-alt-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Change the description</h2>
    <mat-dialog-content>
      <img class="p" [src]="data.url" [alt]="data.alt" />
      <mat-form-field appearance="outline" class="full">
        <mat-label>Describe the picture</mat-label>
        <input matInput [formControl]="alt" maxlength="300" (keyup.enter)="save()" />
        <mat-hint>Required. Helps people using screen readers, and helps Google.</mat-hint>
        @if (alt.touched && alt.invalid) {
          <mat-error>Please describe the picture.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; } .p { max-width: 100%; max-height: 160px; display: block; margin: 0 auto 16px; border-radius: 6px; }`,
})
export class AltDialog {
  private readonly ref = inject<MatDialogRef<AltDialog, string>>(MatDialogRef);
  readonly data = inject<Media>(MAT_DIALOG_DATA);
  readonly alt = new FormControl(this.data.alt, { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] });

  save() {
    this.alt.markAsTouched();
    const v = this.alt.value.trim();
    if (v) this.ref.close(v);
  }
}

@Component({
  selector: 'app-usage-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.blocked ? 'This picture is still in use' : 'Where this picture is used' }}</h2>
    <mat-dialog-content>
      @if (data.blocked) {
        <p>It cannot be deleted yet. Replace it in these places first, then try again.</p>
      }
      @if (data.usage.length === 0) {
        <p>This picture is not used anywhere. It can be deleted safely.</p>
      } @else {
        <ul>
          @for (u of data.usage; track $index) {
            <li><strong>{{ u.type }}:</strong> {{ u.title }} <button mat-button type="button" (click)="go(u)">Open</button></li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-flat-button type="button" mat-dialog-close>OK</button></mat-dialog-actions>
  `,
  styles: `ul { padding-left: 18px; } li { margin-bottom: 6px; }`,
})
export class UsageDialog {
  readonly data = inject<{ usage: MediaUsage[]; blocked: boolean }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef);
  private readonly router = inject(Router);

  go(u: MediaUsage) {
    this.ref.close();
    this.router.navigateByUrl(u.adminPath);
  }
}

/** All uploaded pictures: upload, edit the description, see where one is used, delete (blocked while it is in use). */
@Component({
  selector: 'app-media-library',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatExpansionModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, PageHeader, UploadForm],
  template: `
    <app-page-header title="Pictures" help="Every picture used on the website. Each one needs a short description (used by screen readers and Google)." back="/settings" backLabel="Settings" />

    <mat-expansion-panel class="upload-panel" [expanded]="false">
      <mat-expansion-panel-header><mat-panel-title><mat-icon>add_photo_alternate</mat-icon>&nbsp; Upload a new picture</mat-panel-title></mat-expansion-panel-header>
      <app-upload-form (uploaded)="uploaded($event)" />
    </mat-expansion-panel>

    <mat-form-field appearance="outline" class="search">
      <mat-label>Search by description</mat-label>
      <input matInput [formControl]="search" />
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    @if (loading() && items().length === 0) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (items().length === 0) {
      <p class="empty">No pictures found.</p>
    } @else {
      <div class="grid">
        @for (m of items(); track m.id) {
          <mat-card appearance="outlined" class="item">
            <img [src]="m.url" [alt]="m.alt" loading="lazy" />
            <div class="meta">
              <span class="alt" [title]="m.alt">{{ m.alt }}</span>
              <small>{{ m.width ? m.width + ' × ' + m.height + ' · ' : '' }}{{ size(m.sizeBytes) }}</small>
            </div>
            <div class="btns">
              <button mat-icon-button type="button" (click)="editAlt(m)" aria-label="Change description" title="Change description"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button type="button" (click)="whereUsed(m)" aria-label="Where is it used?" title="Where is it used?"><mat-icon>link</mat-icon></button>
              <button mat-icon-button type="button" (click)="remove(m)" aria-label="Delete" title="Delete"><mat-icon>delete</mat-icon></button>
            </div>
          </mat-card>
        }
      </div>
      @if (items().length < total()) {
        <div class="center"><button mat-stroked-button type="button" (click)="more()" [disabled]="loading()">Show more</button></div>
      }
    }
  `,
  styles: `
    .upload-panel { margin-bottom: 16px; }
    .search { width: 100%; max-width: 420px; }
    .center { display: flex; justify-content: center; padding: 24px; }
    .empty { color: #666; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
    .item { display: flex; flex-direction: column; background: #fff; overflow: hidden; }
    .item img { width: 100%; height: 130px; object-fit: contain; background: #eee; }
    .meta { padding: 8px 12px 0; display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .alt { font-size: 14px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    small { color: #777; }
    .btns { display: flex; justify-content: flex-end; padding: 2px 4px 4px; }
  `,
})
export class MediaLibrary implements OnInit {
  private readonly media = inject(MediaService);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotifyService);

  readonly search = new FormControl('', { nonNullable: true });
  readonly items = signal<Media[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  private page = 1;

  ngOnInit() {
    this.load(true);
    this.search.valueChanges.pipe(debounceTime(300)).subscribe(() => this.load(true));
  }

  more() {
    this.page++;
    this.load(false);
  }

  size(bytes: number) {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private async load(reset: boolean) {
    if (reset) this.page = 1;
    this.loading.set(true);
    try {
      const r = await this.media.list(this.search.value.trim(), this.page);
      r.items.forEach((m) => this.media.remember(m));
      this.items.set(reset ? r.items : [...this.items(), ...r.items]);
      this.total.set(r.total);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  uploaded(m: Media) {
    this.items.update((l) => [m, ...l]);
    this.total.update((t) => t + 1);
  }

  async editAlt(m: Media) {
    const alt = await firstValueFrom(this.dialog.open<AltDialog, Media, string>(AltDialog, { data: m, width: '480px', maxWidth: '96vw' }).afterClosed());
    if (!alt || alt === m.alt) return;
    try {
      const updated = await this.media.updateAlt(m.id, alt);
      this.items.update((l) => l.map((x) => (x.id === m.id ? updated : x)));
      this.notify.success('Description saved');
    } catch (e) {
      this.notify.error(e);
    }
  }

  async whereUsed(m: Media) {
    try {
      const usage = await this.media.usage(m.id);
      this.dialog.open(UsageDialog, { data: { usage, blocked: false }, width: '520px', maxWidth: '96vw' });
    } catch (e) {
      this.notify.error(e);
    }
  }

  async remove(m: Media) {
    const ok = await this.confirm.ask({ title: 'Delete this picture?', message: `“${m.alt}” will be permanently deleted. This cannot be undone.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await this.media.remove(m.id);
      this.items.update((l) => l.filter((x) => x.id !== m.id));
      this.total.update((t) => t - 1);
      this.notify.success('Picture deleted');
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 409 && Array.isArray(e.error?.usage)) {
        this.dialog.open(UsageDialog, { data: { usage: e.error.usage, blocked: true }, width: '520px', maxWidth: '96vw' });
      } else {
        this.notify.error(e);
      }
    }
  }
}
