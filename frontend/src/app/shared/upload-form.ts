import { Component, OnDestroy, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { inject } from '@angular/core';
import { Media, MediaService } from '../core/media.service';
import { NotifyService } from '../core/notify.service';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Choose a file + describe it (alt text is required), then upload. Used in the picture picker and the picture library. */
@Component({
  selector: 'app-upload-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div class="upload">
      <input #file type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="onFile($event)" />
      @if (previewUrl(); as url) {
        <img class="preview" [src]="url" alt="Preview of the chosen picture" />
      }
      <button mat-stroked-button type="button" (click)="file.click()" [disabled]="busy()">
        <mat-icon>upload_file</mat-icon> {{ chosen() ? 'Choose a different picture' : 'Choose a picture from your device' }}
      </button>
      <p class="hint">JPG, PNG or WebP, up to 5 MB. Large pictures are made smaller automatically.</p>
      @if (problem()) {
        <p class="problem">{{ problem() }}</p>
      }

      @if (chosen()) {
        <mat-form-field appearance="outline" class="full">
          <mat-label>Describe the picture</mat-label>
          <input matInput [formControl]="alt" maxlength="300" placeholder="For example: Our team in the Calicut office" />
          <mat-hint>Required. Helps people using screen readers, and helps Google.</mat-hint>
          @if (alt.touched && alt.hasError('required')) {
            <mat-error>Please describe the picture.</mat-error>
          }
        </mat-form-field>
        <button mat-flat-button type="button" (click)="upload()" [disabled]="busy()">
          @if (busy()) {
            <mat-spinner diameter="20" />
          } @else {
            <mat-icon>cloud_upload</mat-icon>
          }
          Upload picture
        </button>
      }
    </div>
  `,
  styles: `
    .upload { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; padding: 8px 0; }
    .full { width: 100%; }
    .preview { max-width: 100%; max-height: 220px; border-radius: 8px; border: 1px solid #ddd; }
    .hint { margin: 0; color: #666; font-size: 13px; }
    .problem { margin: 0; color: #b3261e; }
  `,
})
export class UploadForm implements OnDestroy {
  private readonly media = inject(MediaService);
  private readonly notify = inject(NotifyService);

  readonly uploaded = output<Media>();
  readonly alt = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] });
  readonly chosen = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly problem = signal('');
  readonly busy = signal(false);

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.problem.set('');
    if (!TYPES.includes(file.type)) return this.reject('That file is not a JPG, PNG or WebP picture.');
    if (file.size > MAX_BYTES) return this.reject('That picture is larger than 5 MB. Please choose a smaller one.');
    this.revoke();
    this.chosen.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  private reject(message: string) {
    this.problem.set(message);
    this.chosen.set(null);
    this.revoke();
  }

  async upload() {
    const file = this.chosen();
    this.alt.markAsTouched();
    if (!file || this.alt.invalid || this.busy()) return;
    this.busy.set(true);
    try {
      const m = await this.media.upload(file, this.alt.value.trim());
      this.notify.success('Picture uploaded');
      this.uploaded.emit(m);
      this.chosen.set(null);
      this.alt.reset('');
      this.revoke();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  private revoke() {
    const u = this.previewUrl();
    if (u) URL.revokeObjectURL(u);
    this.previewUrl.set(null);
  }

  ngOnDestroy() {
    this.revoke();
  }
}
