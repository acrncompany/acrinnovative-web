import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { ICONS, iconByClass, iconChar } from '../core/icons';

@Component({
  selector: 'app-icon-picker-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Choose an icon</h2>
    <mat-dialog-content>
      <div class="grid">
        @for (i of icons; track i.cls) {
          <button type="button" class="icon" [class.current]="i.cls === data.current" (click)="ref.close(i.cls)" [attr.aria-label]="i.label">
            <span class="glyph" aria-hidden="true">{{ char(i.code) }}</span>
            <span class="name">{{ i.label }}</span>
          </button>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
    .icon { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border: 2px solid transparent; border-radius: 10px; background: #f6f6f6; cursor: pointer; font: inherit; }
    .icon:hover, .icon:focus-visible { border-color: var(--mat-sys-primary, #1b7a3d); outline: none; }
    .icon.current { border-color: var(--mat-sys-primary, #1b7a3d); background: #e8f4ec; }
    .glyph { font-family: 'FAS'; font-weight: 900; font-size: 26px; line-height: 1; color: #333; }
    .name { font-size: 11px; color: #555; text-align: center; }
  `,
})
export class IconPickerDialog {
  readonly ref = inject<MatDialogRef<IconPickerDialog, string>>(MatDialogRef);
  readonly data = inject<{ current: string }>(MAT_DIALOG_DATA);
  readonly icons = ICONS;
  readonly char = iconChar;
}

/** Picks the small card icon. The control holds a Font Awesome class such as "fas fa-building". */
@Component({
  selector: 'app-icon-field',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="field">
      <span class="label">{{ label() }}</span>
      <div class="row">
        <div class="box" aria-hidden="true">
          @if (current(); as i) {
            <span class="glyph">{{ char(i.code) }}</span>
          } @else {
            <mat-icon>interests</mat-icon>
          }
        </div>
        <span class="name">{{ current()?.label ?? (value() ? 'Custom icon' : 'No icon') }}</span>
        <button mat-stroked-button type="button" (click)="choose()"><mat-icon>apps</mat-icon> Choose icon</button>
        @if (value()) {
          <button mat-button type="button" (click)="clear()">Remove</button>
        }
      </div>
      @if (hint()) {
        <span class="hint">{{ hint() }}</span>
      }
    </div>
  `,
  styles: `
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
    .label { font-size: 14px; font-weight: 500; }
    .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .box { width: 56px; height: 56px; border-radius: 12px; background: #f1ede2; display: grid; place-items: center; flex: none; }
    .glyph { font-family: 'FAS'; font-weight: 900; font-size: 24px; color: #8a6a1f; }
    .name { min-width: 90px; color: #444; }
    .hint { font-size: 12px; color: #666; }
  `,
})
export class IconField {
  readonly control = input.required<FormControl<string | null>>();
  readonly label = input('Icon');
  readonly hint = input('');
  private readonly dialog = inject(MatDialog);
  readonly char = iconChar;
  /** Mirror of the control's value as a signal, so the view updates (the app runs without zone.js). */
  readonly value = signal('');
  readonly current = computed(() => iconByClass(this.value()));

  constructor() {
    effect((onCleanup) => {
      const c = this.control();
      this.value.set(c.value ?? '');
      const sub = c.valueChanges.subscribe((v) => this.value.set(v ?? ''));
      onCleanup(() => sub.unsubscribe());
    });
  }

  async choose() {
    const cls = await firstValueFrom(
      this.dialog.open<IconPickerDialog, { current: string }, string>(IconPickerDialog, { data: { current: this.control().value ?? '' }, width: '640px', maxWidth: '96vw' }).afterClosed(),
    );
    if (!cls) return;
    this.control().setValue(cls);
    this.control().markAsDirty();
  }

  clear() {
    this.control().setValue('');
    this.control().markAsDirty();
  }
}
