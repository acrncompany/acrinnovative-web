import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api } from './api.service';

/** Unread inbox numbers shown as badges in the menu. Refreshed on navigation, every minute, and after reading something. */
@Injectable({ providedIn: 'root' })
export class CountsService {
  private readonly api = inject(Api);
  readonly unreadMessages = signal(0);
  readonly unreadApplications = signal(0);
  readonly unreadTotal = computed(() => this.unreadMessages() + this.unreadApplications());

  async refresh() {
    try {
      const d = await firstValueFrom(this.api.get<{ unreadMessages: number; unreadApplications: number }>('/dashboard'));
      this.unreadMessages.set(d.unreadMessages);
      this.unreadApplications.set(d.unreadApplications);
    } catch {
      /* the badge simply keeps its old value */
    }
  }
}
