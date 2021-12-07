import { Injectable, Component } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { EntryComponent } from './entry.component';

@Injectable()
export class UnsavedChangesGuard implements CanDeactivate<EntryComponent> {
  canDeactivate(component: EntryComponent) {
    if (component.name.dirty) {
      return window.confirm("You have unsaved chnages. Still want to leave?")
    } else {
      return true;
    }
  }
}
