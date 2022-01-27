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


    //https://angular.io/api/service-worker/SwUpdate
    const updatesAvailable = this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      map(evt => ({
        type: 'UPDATE_AVAILABLE',
        current: evt.currentVersion,
        available: evt.latestVersion,
      })));


      if (updatesAvailable) {
        // if( confirm(`Reload the page to update from current version ${evt.currentVersion} to latest version ${evt.latestVersion}. Proceed now?`)) { //TODO:
        if( confirm(`Reload the page to update from the current to the latest version. Proceed now?`)) {
          this.swUpdate.activateUpdate()
          // TODO: OR????
          // window.location.reload
          console.log(`Page reloaded to install next version!`)
        } else {
          console.log(`Don't update YET...`)
        }
      }

    /*



        const updatesAvailable = this.swUpdate.versionUpdates.pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
          map(evt => ({
            type: 'UPDATE_AVAILABLE',
            current: evt.currentVersion,
            available: evt.latestVersion,
          })
          ) => this.snackbar.open('A new version is available!', 'Update now').afterDismissed()
        ).subscribe()


        let result:any
    // from pg 115 ng projects
    // https://github.com/PacktPublishing/Angular-Projects-Second-Edition/issues/7
    this.swUpdate.available.pipe(
      //switchMap(() => this.snackbar.open('A new version is available!', 'Refresh Page to Update now',  {duration: 5000})).afterDismissed(),
      switchMap(() => this.snackbar.open('A new version is available!', 'Update now').afterDismissed()),
      filter(result => result.dismissedByAction),
      map(() => this.swUpdate.activateUpdate().then(() => location.reload()))
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
