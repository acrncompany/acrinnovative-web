import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api } from './api.service';

export interface Media {
  id: number;
  path: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MediaUsage {
  type: string;
  id: number | null;
  title: string;
  adminPath: string;
}

export interface MediaPage {
  total: number;
  page: number;
  limit: number;
  items: Media[];
}

/** The picture library (uploads + alt text). Small cache so form previews don't re-download details. */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly api = inject(Api);
  private readonly cache = new Map<number, Media>();

  async get(id: number | null | undefined): Promise<Media | null> {
    if (!id) return null;
    const hit = this.cache.get(id);
    if (hit) return hit;
    try {
      const m = await firstValueFrom(this.api.get<Media>(`/media/${id}`));
      this.cache.set(id, m);
      return m;
    } catch {
      return null;
    }
  }

  remember(m: Media) {
    this.cache.set(m.id, m);
  }

  list(search: string, page: number, limit = 24) {
    return firstValueFrom(this.api.get<MediaPage>('/media', { search, page, limit }));
  }

  async upload(file: File, alt: string): Promise<Media> {
    const body = new FormData();
    body.append('file', file);
    body.append('alt', alt);
    const m = await firstValueFrom(this.api.post<Media>('/media', body));
    this.remember(m);
    return m;
  }

  async updateAlt(id: number, alt: string): Promise<Media> {
    const m = await firstValueFrom(this.api.patch<Media>(`/media/${id}`, { alt }));
    this.remember(m);
    return m;
  }

  usage(id: number) {
    return firstValueFrom(this.api.get<MediaUsage[]>(`/media/${id}/usage`));
  }

  async remove(id: number) {
    await firstValueFrom(this.api.delete(`/media/${id}`));
    this.cache.delete(id);
  }
}
