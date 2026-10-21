import { Directive, HostListener, inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmService } from './confirm.service';

/** Implemented by every screen with a form. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks "Leave without saving?" when the founder navigates away from a form with unsaved edits. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges?.()) return true;
  return inject(ConfirmService).ask({
    title: 'Leave without saving?',
    message: 'You have changes that have not been saved. If you leave now, they will be lost.',
    confirmText: 'Leave page',
    cancelText: 'Stay and keep editing',
    danger: true,
  });
};

/** Extend this in a form screen to also warn when the browser tab is closed or reloaded. */
@Directive()
export abstract class UnsavedChangesBase implements HasUnsavedChanges {
  abstract hasUnsavedChanges(): boolean;

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}
