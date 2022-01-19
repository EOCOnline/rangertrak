import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
//import { MatSnackBar } from '@material/snackbar'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { filter, map, switchMap } from 'rxjs'

@Component({
  selector: 'rangertrak-root',

  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'rangertrak';

  constructor(
    private swUpdate: SwUpdate,
    private snackbar: MatSnackBar) {
  }

  ngOnInit() {

    const updatesAvailable = this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      map(evt => ({
        type: 'UPDATE_AVAILABLE',
        current: evt.currentVersion,
        available: evt.latestVersion,
      })
      )
    ).subscribe()

    /*
    this.updates.available.pipe(
      switchMap(() => this.snackbar.open('A new version is available!', 'Update now').afterDismissed()),
      filter(result => result.dismissedByAction),
      map(() => this.updates.activateUpdate().then()) => location.reload())
    ).subscribe();
    */
  }

}

/*
(property) SwUpdate.available: Observable<UpdateAvailableEvent>
Emits an UpdateAvailableEvent event whenever a new app version is available.

@deprecated
Use versionUpdates instead.

The of behavior available can be rebuild by filtering for the VersionReadyEvent:

import {filter, map} from 'rxjs/operators';
// ...
const updatesAvailable = swUpdate.versionUpdates.pipe(
filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
map(evt => ({
type: 'UPDATE_AVAILABLE',
current: evt.currentVersion,
available: evt.latestVersion,
})));

*/
