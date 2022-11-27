import { Injectable } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { InstallPromptComponent } from '../'

// From Angular Cookbook, pg 592
// https://web.dev/customize-install
// https://github.com/WICG/manifest-incubations

// https://web.dev/learn/pwa/installation/
// also: https://web.dev/patterns/advanced-apps/shortcuts/
// https://web.dev/learn/pwa/service-workers/npm

// https://love2dev.com/pwa/ - benefits of pwa
// https://love2dev.com/blog/beforeinstallprompt/

@Injectable({
  providedIn: 'root'
})
export class InstallableService {

  installableEvent: Event | null | 1 = 1

  constructor(
    private dialog: MatDialog,
  ) {
    this.init()
  }

  init() {
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
      this.installableEvent.prompt();
      const { outcome } = await this.installableEvent.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
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
    console.log(`'beforeinstallprompt' event was fired.`)
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
