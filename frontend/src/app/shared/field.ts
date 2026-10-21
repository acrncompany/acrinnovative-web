import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FieldDef } from '../core/resources';
import { IconField } from './icon-field';
import { ImageField } from './image-field';
import { RichText } from './rich-text';

/** Draws one form field from its description in core/resources.ts (text box, picture picker, rich editor, ...). */
@Component({
  selector: 'app-field',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, ImageField, IconField, RichText],
  template: `
    @let d = def();
    @let c = control();
    @switch (d.type) {
      @case ('image') {
        <app-image-field [control]="$any(c)" [label]="d.label" [hint]="d.hint ?? ''" />
      }
      @case ('icon') {
        <app-icon-field [control]="$any(c)" [label]="d.label" [hint]="d.hint ?? ''" />
      }
      @case ('richtext') {
        <app-rich-text [control]="$any(c)" [label]="d.label" [hint]="d.hint ?? ''" />
      }
      @case ('bool') {
        <div class="toggle">
          <mat-slide-toggle [formControl]="$any(c)">{{ d.label }}</mat-slide-toggle>
          @if (d.hint) {
            <span class="hint">{{ d.hint }}</span>
          }
        </div>
      }
      @case ('select') {
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ d.label }}</mat-label>
          <mat-select [formControl]="$any(c)" [required]="!!d.required">
            @for (o of choices(); track o.value) {
              <mat-option [value]="o.value">{{ o.label }}</mat-option>
            }
          </mat-select>
          @if (d.hint) {
            <mat-hint>{{ d.hint }}</mat-hint>
          }
          @if (message(); as m) {
            <mat-error>{{ m }}</mat-error>
          }
        </mat-form-field>
      }
      @case ('status') {
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ d.label }}</mat-label>
          <mat-select [formControl]="$any(c)">
            @for (o of choices(); track o.value) {
              <mat-option [value]="o.value">{{ o.label }}</mat-option>
            }
          </mat-select>
          @if (d.hint) {
            <mat-hint>{{ d.hint }}</mat-hint>
          }
        </mat-form-field>
      }
      @case ('textarea') {
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ d.label }}</mat-label>
          <textarea matInput [formControl]="$any(c)" [rows]="d.rows ?? 3" [attr.maxlength]="d.max ?? null" [required]="!!d.required" [placeholder]="d.placeholder ?? ''"></textarea>
          @if (d.hint) {
            <mat-hint>{{ d.hint }}</mat-hint>
          }
          @if (d.max) {
            <mat-hint align="end">{{ length() }} / {{ d.max }}</mat-hint>
          }
          @if (message(); as m) {
            <mat-error>{{ m }}</mat-error>
          }
        </mat-form-field>
      }
      @case ('color') {
        <div class="color">
          <label>{{ d.label }}</label>
          <input type="color" [formControl]="$any(c)" />
          <input class="hex" [formControl]="$any(c)" maxlength="7" aria-label="Colour code" />
          @if (d.hint) {
            <span class="hint">{{ d.hint }}</span>
          }
        </div>
      }
      @default {
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ d.label }}</mat-label>
          <input
            matInput
            [formControl]="$any(c)"
            [type]="inputType()"
            [attr.maxlength]="d.max ?? null"
            [required]="!!d.required"
            [placeholder]="d.placeholder ?? ''"
            [attr.inputmode]="d.type === 'number' ? 'numeric' : null"
            [attr.min]="d.type === 'number' ? 0 : null"
          />
          @if (d.hint) {
            <mat-hint>{{ d.hint }}</mat-hint>
          }
          @if (message(); as m) {
            <mat-error>{{ m }}</mat-error>
          }
        </mat-form-field>
      }
    }
  `,
  styles: `
    .full { width: 100%; }
    .toggle { display: flex; flex-direction: column; gap: 4px; margin: 6px 0 14px; }
    .hint { font-size: 12px; color: #666; }
    .color { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .color label { font-size: 14px; font-weight: 500; min-width: 140px; }
    .color input[type='color'] { width: 48px; height: 36px; padding: 0; border: 1px solid #bbb; border-radius: 6px; background: none; }
    .color .hex { width: 100px; padding: 8px; border: 1px solid #bbb; border-radius: 6px; font: inherit; }
  `,
})
export class Field {
  readonly def = input.required<FieldDef>();
  readonly control = input.required<FormControl>();
  /** Resolved choices for select fields (fixed options, or loaded from the API). */
  readonly options = input<{ value: string | number | boolean; label: string }[]>([]);

  choices() {
    return this.def().options ?? this.options();
  }

  inputType(): string {
    switch (this.def().type) {
      case 'number': return 'number';
      case 'datetime': return 'datetime-local';
      case 'email': return 'email';
      case 'link': return 'text';
      default: return 'text';
    }
  }

  length(): number {
    return String(this.control().value ?? '').length;
  }

  /** The first problem to show under the field (only after it was touched). */
  message(): string {
    const c = this.control();
    if (!c.errors || !(c.touched || c.dirty)) return '';
    if (c.hasError('required')) return 'This field is required.';
    if (c.hasError('maxlength')) return `Too long (at most ${c.getError('maxlength').requiredLength} characters).`;
    if (c.hasError('email')) return 'Please enter a valid email address.';
    if (c.hasError('min')) return 'Must be 0 or more.';
    if (c.hasError('pattern')) return this.def().type === 'link' ? 'Use a link like /contact or https://example.com' : 'This value is not in the right format.';
    return 'Please check this value.';
  }
}
