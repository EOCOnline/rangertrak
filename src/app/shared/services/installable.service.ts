import { Injectable } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { InstallPromptComponent } from '../'

// From Angular Cookbook, pg 592
// https://web.dev/install-criteria/
// https://web.dev/customize-install
// https://github.com/WICG/manifest-incubations

// https://web.dev/learn/pwa/installation/
// also: https://web.dev/patterns/advanced-apps/shortcuts/
// https://web.dev/learn/pwa/service-workers/npm

// https://love2dev.com/pwa/ - benefits of pwa
// https://love2dev.com/blog/beforeinstallprompt/

/**
 *
 * https://web.dev/customize-install/
 * https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 * https://medium.com/runic-software/publishing-your-mapapp-229ba1e8258c
 * https://medium.com/runic-software/simple-guide-to-workbox-in-angular-197c25396e68
 * https://web.dev/app-shortcuts/
 */


@Injectable({
  providedIn: 'root'
})
export class InstallableService {

  // Initialize installableEvent for use later to show browser install prompt.
  installableEvent: Event | null | 1 = 1 // BeforeInstallPromptEvent

  constructor(
    private dialog: MatDialog,
  ) {
    console.log(`'beforeinstallprompt' service construction`)
    window.addEventListener(
      'beforeinstallprompt',
      this.handleInstallPrompt.bind(this)
    )
  }

  async showPrompt() {
    if (!this.installableEvent) {
      return;
    }
    const dialogRef = this.dialog.open(InstallPromptComponent, {
      width: '300px',
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) {
        this.installableEvent = null;
        return;
      }
      if (!this.installableEvent) {
        return
      }
      //this.installableEvent.prompt();
      //const { outcome } = await this.installableEvent.userChoice;
      //console.log(`User response to the install prompt: ${outcome}`)

      // We've used the prompt, and can't use it again, throw it away
      this.installableEvent = null;
    });
  }

  /*
    public get isInstallable() {
      //if (this._installableEvent) {
      return this.installableEvent
      //}
      //return null
    }

      public set isInstallable(instable: boolean) {
        if (isInstallable validity check) {
          throw new Error('invalid');
        }
        this._isInstallable = instable;
      }
    */

  // TODO: This should work once per user session, but isn't persisted to Settings or LocalStorage - if desired...

  handleInstallPrompt(e: Event) {
    // log the platforms provided as options in an install prompt
    //    console.log(e.platforms); // e.g., ["web", "android", "windows"]

    console.log(`'beforeinstallprompt' event was fired.`)

    // https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
    //e.userChoice.then((choiceResult) => {
    //      console.log(choiceResult.outcome); // either "accepted" or "dismissed"
    //}, handleError);

    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()

    // stash the "install this app" event so we can display/trigger it later at time of our choosing
    this.installableEvent = e

    // Notify user the PWA is ready for install: a button in the header, an item in the navigation menu, an item in your content feed, etc.
    // https://web.dev/promote-install/

    // REVIEW: Just set event (done), or actually push an event via subscription?
    // showInstallPromotion()  // TODO: unimplemented

    window.removeEventListener('beforeinstallprompt',
      this.handleInstallPrompt)

    console.log(`'beforeinstallprompt' event handled.`)
  }
}
