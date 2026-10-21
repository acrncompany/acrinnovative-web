import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api } from './api.service';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}

/** Knows who is logged in. The cookie itself is httpOnly (invisible to JavaScript), so we ask the server via /auth/me. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  readonly user = signal<AdminUser | null>(null);
  private checked: Promise<void> | null = null;

  /** Called once on startup (by the route guard). */
  ensureChecked(): Promise<void> {
    this.checked ??= firstValueFrom(this.api.get<{ admin: AdminUser }>('/auth/me'))
      .then((r) => this.user.set(r.admin))
      .catch(() => this.user.set(null));
    return this.checked;
  }

  async login(email: string, password: string) {
    const r = await firstValueFrom(this.api.post<{ admin: AdminUser }>('/auth/login', { email, password }));
    this.user.set(r.admin);
  }

  async logout() {
    try {
      await firstValueFrom(this.api.post('/auth/logout'));
    } finally {
      this.user.set(null);
      await this.router.navigate(['/login']);
    }
  }
}
