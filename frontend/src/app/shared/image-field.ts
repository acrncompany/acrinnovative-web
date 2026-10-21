import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Media, MediaService } from '../core/media.service';
import { MediaPickerDialog } from './media-picker.dialog';

/** A picture field: shows the current picture, "Choose picture" opens the picker, "Remove" clears it. The control holds the Media id. */
@Component({
  selector: 'app-image-field',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="field">
      <span class="label">{{ label() }}</span>
      <div class="row">
        <div class="box">
          @if (media(); as m) {
            <img [src]="m.url" [alt]="m.alt" />
          } @else {
            <mat-icon>image</mat-icon>
          }
        </div>
        <div class="side">
          @if (media(); as m) {
            <span class="alt" title="Description of the picture">“{{ m.alt }}”</span>
          } @else {
            <span class="alt none">No picture chosen</span>
          }
          <div class="buttons">
            <button mat-stroked-button type="button" (click)="choose()">
              <mat-icon>photo_library</mat-icon> {{ media() ? 'Change picture' : 'Choose picture' }}
            </button>
            @if (media()) {
              <button mat-button type="button" (click)="clear()"><mat-icon>close</mat-icon> Remove</button>
            }
          </div>
        </div>
      </div>
      @if (hint()) {
        <span class="hint">{{ hint() }}</span>
      }
    </div>
  `,
  styles: `
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
    .label { font-size: 14px; font-weight: 500; }
    .row { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
    .box { width: 120px; height: 90px; border: 1px dashed #bbb; border-radius: 8px; display: grid; place-items: center; background: #f4f4f4; overflow: hidden; flex: none; }
    .box img { width: 100%; height: 100%; object-fit: contain; }
    .side { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1 1 200px; }
    .alt { font-size: 13px; color: #444; overflow: hidden; text-overflow: ellipsis; }
    .alt.none { color: #888; }
    .buttons { display: flex; gap: 6px; flex-wrap: wrap; }
    .hint { font-size: 12px; color: #666; }
  `,
})
export class ImageField implements OnInit {
  readonly control = input.required<FormControl<number | null>>();
  readonly label = input('Picture');
  readonly hint = input('');

  private readonly dialog = inject(MatDialog);
  private readonly mediaService = inject(MediaService);
  readonly media = signal<Media | null>(null);

  async ngOnInit() {
    this.media.set(await this.mediaService.get(this.control().value));
  }

  async choose() {
    const m = await firstValueFrom(
      this.dialog.open<MediaPickerDialog, void, Media>(MediaPickerDialog, { width: '720px', maxWidth: '96vw' }).afterClosed(),
    );
    if (!m) return;
    this.media.set(m);
    this.control().setValue(m.id);
    this.control().markAsDirty();
  }

  clear() {
    this.media.set(null);
    this.control().setValue(null);
    this.control().markAsDirty();
  }
}
