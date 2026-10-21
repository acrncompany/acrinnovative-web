import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Thin wrapper around HttpClient for the admin API (/api/admin/...). The login cookie is sent automatically (same origin). */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  readonly base = '/api/admin';

  private params(query?: Record<string, unknown>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    return p;
  }

  get<T = any>(path: string, query?: Record<string, unknown>): Observable<T> {
    return this.http.get<T>(this.base + path, { params: this.params(query) });
  }
  post<T = any>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.base + path, body ?? {});
  }
  patch<T = any>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.base + path, body);
  }
  put<T = any>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.base + path, body);
  }
  delete<T = any>(path: string): Observable<T> {
    return this.http.delete<T>(this.base + path);
  }
}
