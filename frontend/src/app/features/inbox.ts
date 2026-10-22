import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { Api } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { CountsService } from '../core/counts.service';
import { NotifyService } from '../core/notify.service';
import { PageHeader } from '../shared/page-header';

type Kind = 'messages' | 'applications';
const ENDPOINT: Record<Kind, string> = { messages: '/contact-messages', applications: '/applications' };

/** "Delete items older than N months": shows how many would go, then asks for the final click. */
@Component({
  selector: 'app-purge-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Delete old {{ data.kind === 'messages' ? 'messages' : 'job applications' }}</h2>
    <mat-dialog-content>
      <p>
        Removes everything received before the date below. It cannot be undone.
        @if (data.kind === 'applications') {
          <strong>The CV files are deleted too.</strong>
        }
      </p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Delete items older than</mat-label>
        <mat-select [value]="months()" (selectionChange)="choose($event.value)">
          @for (m of options; track m) {
            <mat-option [value]="m">{{ m === 1 ? '1 month' : m + ' months' }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <p class="result" aria-live="polite">
        @if (loading()) {
          <mat-spinner diameter="18" /> Counting…
        } @else if (count() === 0) {
          Nothing is that old, so there is nothing to delete.
        } @else {
          <span><strong>{{ count() }}</strong> {{ count() === 1 ? 'item' : 'items' }} received before <strong>{{ before() }}</strong> will be permanently deleted.</span>
        }
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" class="danger-button" (click)="confirm()" [disabled]="loading() || busy() || count() === 0">
        Delete {{ count() || '' }} {{ count() === 1 ? 'item' : 'items' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; }
    .result { display: flex; align-items: center; gap: 8px; margin: 0; }
  `,
})
export class PurgeDialog implements OnInit {
  readonly data = inject<{ kind: Kind }>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<PurgeDialog, number>>(MatDialogRef);
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);
  readonly options = [1, 3, 6, 12, 24, 36];
  readonly months = signal(12);
  readonly count = signal(0);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly before = computed(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - this.months());
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  ngOnInit() {
    this.refresh();
  }

  choose(m: number) {
    this.months.set(m);
    this.refresh();
  }

  private async refresh() {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.api.get<{ count: number }>(`${ENDPOINT[this.data.kind]}/purge/count`, { months: this.months() }));
      this.count.set(r.count);
    } catch (e) {
      this.notify.error(e);
      this.count.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  async confirm() {
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.api.post<{ deleted: number }>(`${ENDPOINT[this.data.kind]}/purge`, { months: this.months() }));
      this.ref.close(r.deleted);
    } catch (e) {
      this.notify.error(e);
      this.busy.set(false);
    }
  }
}

/** Inbox list. One component for both tabs (contact messages and job applications). */
@Component({
  selector: 'app-inbox-list',
  imports: [DatePipe, RouterLink, MatBadgeModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, PageHeader],
  template: `
    <app-page-header title="Inbox" help="Messages from the Contact form and job applications from the website.">
      <button mat-stroked-button type="button" (click)="purge()"><mat-icon>auto_delete</mat-icon> Delete old items…</button>
    </app-page-header>

    <div class="tabs">
      <a mat-stroked-button routerLink="/inbox/messages" [class.on]="kind === 'messages'"
        ><mat-icon>mail</mat-icon> Messages @if (counts.unreadMessages() > 0) { <span class="pill">{{ counts.unreadMessages() }} new</span> }</a>
      <a mat-stroked-button routerLink="/inbox/applications" [class.on]="kind === 'applications'"
        ><mat-icon>description</mat-icon> Job applications @if (counts.unreadApplications() > 0) { <span class="pill">{{ counts.unreadApplications() }} new</span> }</a>
    </div>

    <mat-button-toggle-group class="filter" [value]="unreadOnly() ? 'unread' : 'all'" (change)="setUnread($event.value === 'unread')" aria-label="Show">
      <mat-button-toggle value="all">All</mat-button-toggle>
      <mat-button-toggle value="unread">Unread only</mat-button-toggle>
    </mat-button-toggle-group>

    @if (loading() && items().length === 0) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (items().length === 0) {
      <mat-card appearance="outlined" class="empty"><mat-card-content><mat-icon>inbox</mat-icon><p>{{ unreadOnly() ? 'No unread items.' : 'Nothing here yet.' }}</p></mat-card-content></mat-card>
    } @else {
      <div class="rows">
        @for (m of items(); track m.id) {
          <a class="row" [routerLink]="'/inbox/' + kind + '/' + m.id" [class.unread]="!m.isRead">
            <span class="dot" [attr.aria-label]="m.isRead ? 'Read' : 'Unread'"></span>
            <span class="text">
              <span class="who">{{ m.name }} <small>{{ m.email }}</small></span>
              <span class="subject">{{ kind === 'messages' ? m.subject : (m.job?.title ? 'Applied for: ' + m.job.title : 'Open application') }}</span>
              @if (kind === 'messages') {
                <span class="preview">{{ m.message }}</span>
              }
            </span>
            <span class="date">{{ m.createdAt | date: 'd MMM, h:mm a' }}</span>
          </a>
        }
      </div>
      @if (items().length < total()) {
        <div class="center"><button mat-stroked-button type="button" (click)="more()" [disabled]="loading()">Show older</button></div>
      }
    }
  `,
  styles: `
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .tabs .on { background: #e8f4ec; border-color: #1b7a3d; }
    .pill { background: #c62828; color: #fff; border-radius: 10px; padding: 0 8px; font-size: 12px; margin-left: 6px; }
    .filter { margin-bottom: 16px; }
    .center { display: flex; justify-content: center; padding: 24px; }
    .empty { text-align: center; padding: 24px; color: #666; }
    .empty mat-icon { font-size: 40px; width: 40px; height: 40px; color: #aaa; }
    .rows { display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; gap: 12px; align-items: center; padding: 12px 14px; background: #fff; border: 1px solid #e5e5e0; border-radius: 12px; text-decoration: none; color: inherit; }
    .row:hover, .row:focus-visible { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
    .row.unread { border-left: 4px solid #c62828; font-weight: 500; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: transparent; flex: none; }
    .unread .dot { background: #c62828; }
    .text { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: 2px; }
    .who small { color: #777; font-weight: 400; margin-left: 6px; }
    .subject { color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview { color: #777; font-weight: 400; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .date { color: #777; font-size: 12px; flex: none; font-weight: 400; }
    @media (max-width: 600px) { .date { display: none; } .who small { display: block; margin-left: 0; } }
  `,
})
export class InboxList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  readonly counts = inject(CountsService);

  kind: Kind = 'messages';
  readonly items = signal<any[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly unreadOnly = signal(false);
  private page = 1;

  ngOnInit() {
    this.kind = this.route.snapshot.data['kind'];
    this.load(true);
  }

  async purge() {
    const deleted = await firstValueFrom(
      this.dialog.open<PurgeDialog, { kind: Kind }, number>(PurgeDialog, { data: { kind: this.kind }, width: '460px', maxWidth: '96vw' }).afterClosed(),
    );
    if (deleted === undefined) return; // cancelled
    this.notify.success(`${deleted} ${deleted === 1 ? 'item' : 'items'} deleted`);
    this.load(true);
  }

  setUnread(v: boolean) {
    this.unreadOnly.set(v);
    this.load(true);
  }

  more() {
    this.page++;
    this.load(false);
  }

  private async load(reset: boolean) {
    if (reset) this.page = 1;
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.api.get(ENDPOINT[this.kind], { unread: this.unreadOnly() ? 'true' : '', page: this.page }));
      this.items.set(reset ? r.items : [...this.items(), ...r.items]);
      this.total.set(r.total);
      this.counts.refresh();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}

/** One message / application. Opening it marks it as read. */
@Component({
  selector: 'app-inbox-detail',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, PageHeader],
  template: `
    @if (item(); as m) {
      <app-page-header [title]="kind === 'messages' ? m.subject : m.name" [back]="'/inbox/' + kind" [backLabel]="kind === 'messages' ? 'Messages' : 'Job applications'">
        <button mat-stroked-button type="button" (click)="toggleRead()"><mat-icon>{{ m.isRead ? 'mark_email_unread' : 'drafts' }}</mat-icon> {{ m.isRead ? 'Mark as unread' : 'Mark as read' }}</button>
        <button mat-stroked-button type="button" class="danger-outline" (click)="remove()"><mat-icon>delete</mat-icon> Delete</button>
      </app-page-header>
      <mat-card appearance="outlined">
        <mat-card-content>
          <dl>
            <dt>From</dt><dd>{{ m.name }}</dd>
            <dt>Email</dt><dd><a [href]="'mailto:' + m.email">{{ m.email }}</a></dd>
            @if (m.phone) { <dt>Phone</dt><dd><a [href]="'tel:' + m.phone">{{ m.phone }}</a></dd> }
            @if (m.company) { <dt>Company</dt><dd>{{ m.company }}</dd> }
            @if (kind === 'applications') { <dt>Applied for</dt><dd>{{ m.job?.title ?? 'Open application (no specific job)' }}</dd> }
            <dt>Received</dt><dd>{{ m.createdAt | date: 'EEEE, d MMMM y, h:mm a' }}</dd>
          </dl>
          @if (m.message) {
            <h2>{{ kind === 'messages' ? 'Message' : 'Note from the applicant' }}</h2>
            <p class="body">{{ m.message }}</p>
          }
          <div class="actions">
            @if (kind === 'applications') {
              <a mat-flat-button [href]="'/api/admin/applications/' + m.id + '/cv'"><mat-icon>download</mat-icon> Download CV ({{ m.cvOriginalName }})</a>
            }
            <a mat-stroked-button [href]="'mailto:' + m.email + (kind === 'messages' ? '?subject=' + encode('Re: ' + m.subject) : '')"><mat-icon>reply</mat-icon> Reply by email</a>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <div class="center"><mat-spinner diameter="40" /></div>
    }
  `,
  styles: `
    .center { display: flex; justify-content: center; padding: 48px; }
    mat-card-content { padding-top: 16px; }
    dl { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0 0 16px; }
    dt { color: #666; } dd { margin: 0; overflow-wrap: anywhere; }
    h2 { font-size: 16px; font-weight: 500; margin: 16px 0 6px; }
    .body { white-space: pre-wrap; background: #f7f7f4; border-radius: 8px; padding: 14px; margin: 0 0 16px; overflow-wrap: anywhere; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .danger-outline { color: #b3261e; }
  `,
})
export class InboxDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Api);
  private readonly notify = inject(NotifyService);
  private readonly counts = inject(CountsService);
  private readonly confirm = inject(ConfirmService);

  kind: Kind = 'messages';
  readonly item = signal<any | null>(null);
  readonly encode = encodeURIComponent;
  private readonly endpoint = computed(() => ENDPOINT[this.kind]);

  async ngOnInit() {
    this.kind = this.route.snapshot.data['kind'];
    const id = this.route.snapshot.paramMap.get('id');
    try {
      let m = await firstValueFrom(this.api.get(`${this.endpoint()}/${id}`));
      if (!m.isRead) {
        m = { ...m, ...(await firstValueFrom(this.api.patch(`${this.endpoint()}/${id}`, { isRead: true }))) };
        this.counts.refresh();
      }
      this.item.set(m);
    } catch (e) {
      this.notify.error(e);
      this.router.navigateByUrl('/inbox/' + this.kind);
    }
  }

  async remove() {
    const m = this.item()!;
    const isMessage = this.kind === 'messages';
    const ok = await this.confirm.ask({
      title: isMessage ? 'Delete this message?' : 'Delete this application?',
      message: isMessage
        ? `The message “${m.subject}” from ${m.name} will be permanently deleted. This cannot be undone.`
        : `The application from ${m.name} will be permanently deleted, together with the CV file. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(`${this.endpoint()}/${m.id}`));
      this.counts.refresh();
      this.notify.success('Deleted');
      await this.router.navigateByUrl('/inbox/' + this.kind);
    } catch (e) {
      this.notify.error(e);
    }
  }

  async toggleRead() {
    const m = this.item()!;
    try {
      const updated = await firstValueFrom(this.api.patch(`${this.endpoint()}/${m.id}`, { isRead: !m.isRead }));
      this.item.set({ ...m, ...updated });
      this.counts.refresh();
      this.notify.success(updated.isRead ? 'Marked as read' : 'Marked as unread');
    } catch (e) {
      this.notify.error(e);
    }
  }
}
