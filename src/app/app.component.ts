import { filter, map, switchMap } from 'rxjs'

import { Component, OnInit, HostListener } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
//import { MatSnackBar } from '@material/snackbar'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'

import { LogService } from './shared/services'

@Component({
    selector: 'rangertrak-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit {
  @HostListener('window:beforeinstallprompt', ['$event'])

  private id = "AppComponent"
  title = 'RangerTrak'
  pageDescr = `Track & map Rangers' progress & reports on a mission`
  updateEvt: any = null

  // https://stackoverflow.com/questions/53871586/angular-catch-beforeinstallprompt-event-add-to-homescreen-in-dev-tools-applic
  deferredPrompt: any;
  showButton = false;


  constructor(
    private swUpdate: SwUpdate,
    private log: LogService,
    private snackbar: MatSnackBar) {
  }



  ngOnInit() {
    // https://angular.io/api/service-worker/SwUpdate
    // https://angular.io/guide/service-worker-communications#swupdate-service
    // https://angular.io/api/service-worker/UpdateAvailableEvent
    /*
    const updatesAvailable = swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      map(evt => ({
        type: 'UPDATE_AVAILABLE',
        current: evt.currentVersion,
        available: evt.latestVersion,
      })));
    */
    console.log(`this.swUpdate.versionUpdates: ${JSON.stringify(this.swUpdate.versionUpdates)}`)

    const updatesAvailable =
      this.swUpdate.versionUpdates.pipe(

        filter(
          (evt): evt is VersionReadyEvent => {
            if (evt.type === 'VERSION_READY') {
              console.log(`Version update event: ${JSON.stringify(evt)}`)
              this.updateEvt = evt
              return true
            } else {
              console.log(`NOT a Version ready event: ${JSON.stringify(evt)}`)
              return false
            }
          }
        ),

        map(evt => {
          ({
            type: 'UPDATE_AVAILABLE',
            current: evt.currentVersion,
            available: evt.latestVersion,
          })
          //this.updateEvt = evt
        }
        )
      )


    // See also version setting in service/settings.ts
    // https://www.npmjs.com/package/standard-version: npm run release
    if (updatesAvailable) {
      if (this.updateEvt) {
        console.warn(`New update available: Current: ${this.updateEvt.currentVersion}; Future: ${this.updateEvt.latestVersion}`)//, this.id)
      } else {
        console.warn(`Version update but no this.updateEvt `)//, this.id)
      }
      // if( confirm(`Reload the page to update from current version ${evt.currentVersion} to latest version ${evt.latestVersion}. Proceed now?`)) { //TODO:
      //if( confirm(`Reload the page to update from the current to the latest version. Proceed now?`)) { // TODO: This showed up for every page refresh!!! (Try CNTRL-F5?)
      /* BUG: Gets: Error: Uncaught (in promise): Error: Service workers are disabled or not supported by this browser
        Error: Service workers are disabled or not supported by this browser
        at SwUpdate.activateUpdate (vendor.js:280128:29)
        at AppComponent.ngOnInit (main.js:302:27) */
      //this.swUpdate.activateUpdate()
      // TODO: OR????
      // window.location.reload()
      console.warn(`App Updates ARE Available!  Reload page to install next version????`)
      //  } else {
      //    console.log(`Don't update YET...`)
      //  }
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
    this.log.verbose(`Reloading window!`, this.id)
    */
  }



  onbeforeinstallprompt(e: Event) {
    console.log(e);
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    this.deferredPrompt = e;
    this.showButton = true;
  }


  addToHomeScreen() {
    // hide our user interface that shows our A2HS button
    this.showButton = false;
    // Show the prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    /*this.deferredPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        this.deferredPrompt = null;
      });
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

