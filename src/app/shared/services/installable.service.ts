import { Injectable } from '@angular/core';

// From Angular Cookbook, pg 592
// https://web.dev/customize-install
// https://github.com/WICG/manifest-incubations

// https://web.dev/learn/pwa/installation/
// also: https://web.dev/patterns/advanced-apps/shortcuts/
// https://web.dev/learn/pwa/service-workers/

@Injectable({
  providedIn: 'root'
})
export class InstallableService {

  installableEvent: Event | null | 1 = 1

  constructor() {
    this.init()
  }

  init() {
    console.log(`'beforeinstallprompt' service construction`)
    window.addEventListener(
      'beforeinstallprompt',
      this.handleInstallPrompt.bind(this)
    )
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
