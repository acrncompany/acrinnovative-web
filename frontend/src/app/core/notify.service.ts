import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Turn whatever went wrong into one plain-English sentence for the founder. */
export function messageOf(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0 || e.status === 401) return ''; // already announced by the session interceptor
    if (e.status === 413) return 'That file is too large. Images can be up to 5 MB.';
    if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    const body = e.error;
    const msg = body?.message;
    if (Array.isArray(msg)) return msg.join(' · ');
    if (typeof msg === 'string' && msg) return msg;
    if (e.status >= 500) return 'Something went wrong on the server. Please try again in a moment.';
  }
  return 'Something went wrong. Please try again.';
}

/** Success / error pop-up messages (bottom of the screen). */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly bar = inject(MatSnackBar);

  success(message: string) {
    this.bar.open(message, 'OK', { duration: 3500, panelClass: 'snack-success', horizontalPosition: 'center' });
  }

  error(e: unknown) {
    const text = typeof e === 'string' ? e : messageOf(e);
    if (text) this.bar.open(text, 'Close', { duration: 9000, panelClass: 'snack-error', horizontalPosition: 'center' });
  }
}
