import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../core/auth.service';
import { messageOf } from '../core/notify.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div class="wrap">
      <mat-card appearance="outlined" class="card">
        <mat-card-header>
          <mat-card-title><mat-icon class="logo">web</mat-icon> Website editor</mat-card-title>
          <mat-card-subtitle>Please log in to change the website.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Email address</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" autofocus />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <mat-error>Please enter your email address.</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Password</mat-label>
              <input matInput [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'">
                <mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>Please enter your password.</mat-error>
              }
            </mat-form-field>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button class="full submit" type="submit" [disabled]="busy()">
              @if (busy()) {
                <mat-spinner diameter="22" />
              } @else {
                Log in
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 16px; background: #f1f4ef; }
    .card { width: 100%; max-width: 400px; padding: 12px 8px; }
    mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 24px; margin-bottom: 4px; }
    .logo { color: #1b7a3d; }
    mat-card-content { padding-top: 20px; }
    .full { width: 100%; }
    .submit { height: 48px; font-size: 16px; }
    .error { color: #b3261e; margin: 0 0 12px; }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly busy = signal(false);
  readonly show = signal(false);
  readonly error = signal('');

  constructor() {
    this.auth.ensureChecked().then(() => {
      if (this.auth.user()) this.router.navigateByUrl('/');
    });
  }

  async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
    } catch (e) {
      this.error.set(e instanceof HttpErrorResponse && e.status === 401 ? 'The email or password is not correct. Please try again.' : messageOf(e) || 'Could not log in. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
