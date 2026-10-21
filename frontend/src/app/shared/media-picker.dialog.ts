import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { debounceTime } from 'rxjs';
import { Media, MediaService } from '../core/media.service';
import { NotifyService } from '../core/notify.service';
import { UploadForm } from './upload-form';

/** "Choose a picture": pick one that is already uploaded, or upload a new one (alt text required). Returns the Media. */
@Component({
  selector: 'app-media-picker-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatTabsModule, UploadForm],
  template: `
    <h2 mat-dialog-title>Choose a picture</h2>
    <mat-dialog-content>
      <mat-tab-group animationDuration="0ms" [selectedIndex]="tab()" (selectedIndexChange)="tab.set($event)">
        <mat-tab label="Pictures already uploaded">
          <mat-form-field appearance="outline" class="search">
            <mat-label>Search by description</mat-label>
            <input matInput [formControl]="search" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          @if (loading() && items().length === 0) {
            <div class="center"><mat-spinner diameter="36" /></div>
          } @else if (items().length === 0) {
            <p class="empty">No pictures found. Use the “Upload a new picture” tab.</p>
          } @else {
            <div class="grid">
              @for (m of items(); track m.id) {
                <button type="button" class="thumb" (click)="pick(m)" [attr.aria-label]="'Use picture: ' + m.alt">
                  <img [src]="m.url" [alt]="m.alt" loading="lazy" />
                  <span>{{ m.alt }}</span>
                </button>
              }
            </div>
            @if (items().length < total()) {
              <div class="center"><button mat-stroked-button type="button" (click)="more()" [disabled]="loading()">Show more</button></div>
            }
          }
        </mat-tab>
        <mat-tab label="Upload a new picture">
          <app-upload-form (uploaded)="pick($event)" />
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host { display: block; }
    mat-dialog-content { min-height: 320px; }
    .search { width: 100%; margin-top: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
    .thumb { border: 2px solid transparent; background: #fafafa; border-radius: 8px; padding: 6px; cursor: pointer; text-align: left; font: inherit; }
    .thumb:hover, .thumb:focus-visible { border-color: var(--mat-sys-primary, #1b7a3d); outline: none; }
    .thumb img { width: 100%; height: 90px; object-fit: contain; background: #eee; border-radius: 4px; display: block; }
    .thumb span { display: block; font-size: 12px; margin-top: 4px; color: #444; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .center { display: flex; justify-content: center; padding: 16px; }
    .empty { color: #666; padding: 16px 0; }
  `,
})
export class MediaPickerDialog implements OnInit {
  private readonly ref = inject<MatDialogRef<MediaPickerDialog, Media>>(MatDialogRef);
  private readonly media = inject(MediaService);
  private readonly notify = inject(NotifyService);

  readonly search = new FormControl('', { nonNullable: true });
  readonly items = signal<Media[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly tab = signal(0);
  private page = 1;

  ngOnInit() {
    this.load(true);
    this.search.valueChanges.pipe(debounceTime(300)).subscribe(() => this.load(true));
  }

  more() {
    this.page++;
    this.load(false);
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

  pick(m: Media) {
    this.ref.close(m);
  }
}
