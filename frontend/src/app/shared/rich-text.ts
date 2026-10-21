import { Component, ElementRef, OnDestroy, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import { firstValueFrom } from 'rxjs';
import { Media } from '../core/media.service';
import { MediaPickerDialog } from './media-picker.dialog';

@Component({
  selector: 'app-link-dialog',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Add a link</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Link address</mat-label>
        <input matInput [(ngModel)]="url" placeholder="https://example.com or /contact" (keyup.enter)="save()" />
        <mat-hint>Leave empty to remove the link.</mat-hint>
      </mat-form-field>
      @if (bad()) {
        <p class="bad">The link must start with https://, http://, /, mailto: or tel:</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" (click)="save()">OK</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; } .bad { color: #b3261e; margin: 0; }`,
})
export class LinkDialog {
  private readonly ref = inject<MatDialogRef<LinkDialog, string>>(MatDialogRef);
  private readonly data = inject<{ url: string }>(MAT_DIALOG_DATA);
  url = this.data.url;
  readonly bad = signal(false);

  save() {
    const v = this.url.trim();
    if (v && !/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(v)) return this.bad.set(true);
    this.ref.close(v);
  }
}

/**
 * Simple word-processor style editor (bold, italic, headings, lists, quotes, links, pictures).
 * Built on Tiptap. The result is HTML; the server sanitises it again before saving and before showing it.
 */
@Component({
  selector: 'app-rich-text',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="wrap" [class.focused]="focused()">
      <span class="label">{{ label() }}</span>
      <div class="toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" mat-icon-button (click)="cmd('bold')" [class.on]="active('bold')" matTooltip="Bold" aria-label="Bold"><mat-icon>format_bold</mat-icon></button>
        <button type="button" mat-icon-button (click)="cmd('italic')" [class.on]="active('italic')" matTooltip="Italic" aria-label="Italic"><mat-icon>format_italic</mat-icon></button>
        <button type="button" mat-button class="txt" (click)="heading(2)" [class.on]="active('heading', { level: 2 })" matTooltip="Large heading">Heading</button>
        <button type="button" mat-button class="txt" (click)="heading(3)" [class.on]="active('heading', { level: 3 })" matTooltip="Smaller heading">Sub-heading</button>
        <button type="button" mat-icon-button (click)="cmd('bulletList')" [class.on]="active('bulletList')" matTooltip="Bullet list" aria-label="Bullet list"><mat-icon>format_list_bulleted</mat-icon></button>
        <button type="button" mat-icon-button (click)="cmd('orderedList')" [class.on]="active('orderedList')" matTooltip="Numbered list" aria-label="Numbered list"><mat-icon>format_list_numbered</mat-icon></button>
        <button type="button" mat-icon-button (click)="cmd('blockquote')" [class.on]="active('blockquote')" matTooltip="Quote" aria-label="Quote"><mat-icon>format_quote</mat-icon></button>
        <button type="button" mat-icon-button (click)="link()" [class.on]="active('link')" matTooltip="Link" aria-label="Link"><mat-icon>link</mat-icon></button>
        <button type="button" mat-icon-button (click)="picture()" matTooltip="Insert picture" aria-label="Insert picture"><mat-icon>image</mat-icon></button>
        <button type="button" mat-icon-button (click)="undo()" matTooltip="Undo" aria-label="Undo"><mat-icon>undo</mat-icon></button>
        <button type="button" mat-icon-button (click)="redo()" matTooltip="Redo" aria-label="Redo"><mat-icon>redo</mat-icon></button>
      </div>
      <div #host class="editor"></div>
    </div>
    @if (hint()) {
      <span class="hint">{{ hint() }}</span>
    }
  `,
  styles: `
    .wrap { border: 1px solid #b8b8b8; border-radius: 8px; background: #fff; }
    .wrap.focused { border-color: var(--mat-sys-primary, #1b7a3d); box-shadow: 0 0 0 1px var(--mat-sys-primary, #1b7a3d); }
    .label { display: block; font-size: 14px; font-weight: 500; padding: 8px 12px 0; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 2px; padding: 4px 6px; border-bottom: 1px solid #e3e3e3; }
    .toolbar .on { background: #e3f0e8; color: #14612f; }
    .toolbar .txt { min-width: 0; padding: 0 10px; font-size: 13px; }
    .hint { display: block; font-size: 12px; color: #666; margin: 4px 0 8px; }
    :host ::ng-deep .editor .ProseMirror { min-height: 240px; max-height: 60vh; overflow-y: auto; padding: 12px 14px; outline: none; line-height: 1.6; }
    :host ::ng-deep .editor .ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; }
    :host ::ng-deep .editor .ProseMirror blockquote { border-left: 3px solid #c89b42; margin-left: 0; padding-left: 14px; color: #555; }
    :host ::ng-deep .editor .ProseMirror a { color: #1565c0; text-decoration: underline; }
    :host ::ng-deep .editor .ProseMirror h2 { font-size: 1.4em; margin: 0.8em 0 0.4em; }
    :host ::ng-deep .editor .ProseMirror h3 { font-size: 1.15em; margin: 0.8em 0 0.4em; }
  `,
})
export class RichText implements OnInit, OnDestroy {
  readonly control = input.required<FormControl<string>>();
  readonly label = input('');
  readonly hint = input('');

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly dialog = inject(MatDialog);
  private editor?: Editor;
  /** Bumped on every editor change so the toolbar buttons re-evaluate which formats are active. */
  private readonly tick = signal(0);
  readonly focused = signal(false);

  ngOnInit() {
    this.editor = new Editor({
      element: this.host().nativeElement,
      extensions: [
        // Only the formats the website's sanitiser allows.
        StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: false }, strike: false, code: false, codeBlock: false, horizontalRule: false }),
        Image.configure({ inline: false }),
      ],
      content: this.control().value || '',
      onUpdate: ({ editor }) => {
        const html = editor.isEmpty ? '' : editor.getHTML();
        this.control().setValue(html);
        this.control().markAsDirty();
        this.tick.update((n) => n + 1);
      },
      onSelectionUpdate: () => this.tick.update((n) => n + 1),
      onFocus: () => this.focused.set(true),
      onBlur: () => {
        this.focused.set(false);
        this.control().markAsTouched();
      },
    });
  }

  active(name: string, attrs?: Record<string, unknown>): boolean {
    this.tick();
    return !!this.editor?.isActive(name, attrs);
  }

  cmd(name: 'bold' | 'italic' | 'bulletList' | 'orderedList' | 'blockquote') {
    const chain = this.editor!.chain().focus();
    ({ bold: () => chain.toggleBold(), italic: () => chain.toggleItalic(), bulletList: () => chain.toggleBulletList(), orderedList: () => chain.toggleOrderedList(), blockquote: () => chain.toggleBlockquote() })[name]().run();
  }

  heading(level: 2 | 3) {
    this.editor!.chain().focus().toggleHeading({ level }).run();
  }

  undo() {
    this.editor!.chain().focus().undo().run();
  }

  redo() {
    this.editor!.chain().focus().redo().run();
  }

  async link() {
    const e = this.editor!;
    const current = (e.getAttributes('link')['href'] as string | undefined) ?? '';
    const url = await firstValueFrom(this.dialog.open<LinkDialog, { url: string }, string>(LinkDialog, { data: { url: current }, width: '440px', maxWidth: '96vw' }).afterClosed());
    if (url === undefined) return; // cancelled
    if (url === '') e.chain().focus().extendMarkRange('link').unsetLink().run();
    else e.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  async picture() {
    const m = await firstValueFrom(this.dialog.open<MediaPickerDialog, void, Media>(MediaPickerDialog, { width: '720px', maxWidth: '96vw' }).afterClosed());
    if (m) this.editor!.chain().focus().setImage({ src: m.url, alt: m.alt }).run();
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }
}
