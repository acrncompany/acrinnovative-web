import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { Api } from '../core/api.service';
import { NotifyService } from '../core/notify.service';
import { UnsavedChangesBase } from '../core/unsaved';
import { PageHeader } from '../shared/page-header';

const matching = (g: AbstractControl): ValidationErrors | null =>
  g.get('newPassword')?.value === g.get('repeat')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, PageHeader],
  template: `
    <app-page-header title="My account" help="Change your password. Use at least 10 characters; a short sentence is a good password." back="/settings" backLabel="Settings" />
    <mat-card appearance="outlined">
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Current password</mat-label>
            <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
            @if (form.controls.currentPassword.touched && form.controls.currentPassword.invalid) {
              <mat-error>Please enter your current password.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>New password</mat-label>
            <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
            @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) {
              <mat-error>The new password needs at least 10 characters.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Repeat the new password</mat-label>
            <input matInput type="password" formControlName="repeat" autocomplete="new-password" />
            @if (form.controls.repeat.touched && form.hasError('mismatch')) {
              <mat-error>The two passwords are not the same.</mat-error>
            }
          </mat-form-field>
          <button mat-flat-button type="submit" [disabled]="busy()">
            @if (busy()) {
              <mat-spinner diameter="20" />
            } @else {
              Change password
            }
          </button>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    mat-card { max-width: 480px; }
    mat-card-content { padding-top: 16px; }
    .full { width: 100%; }
  `,
})
export class Account extends UnsavedChangesBase {
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);
  readonly busy = signal(false);
  readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(200)] }),
      repeat: new FormControl('', { nonNullable: true }),
    },
    { validators: matching },
  );

  hasUnsavedChanges() {
    return this.form.dirty;
  }

  async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const { currentPassword, newPassword } = this.form.getRawValue();
      await firstValueFrom(this.api.post('/auth/change-password', { currentPassword, newPassword }));
      this.form.reset({ currentPassword: '', newPassword: '', repeat: '' });
      this.notify.success('Your password has been changed.');
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
