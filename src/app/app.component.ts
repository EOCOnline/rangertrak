import { CommonModule } from '@angular/common'
import { Component, OnInit, HostListener, ChangeDetectionStrategy } from '@angular/core'
import { RouterModule } from '@angular/router'
import { MatSnackBarModule } from '@angular/material/snack-bar'

import { LogService, StoragePersistenceService, UpdateService } from './shared/services'
import { HeaderComponent } from './shared/header/header.component'
import { NavbarComponent } from './shared/navbar/navbar.component'
import { FooterComponent } from './shared/footer/footer.component'
import { AlertsComponent } from './shared/alerts/alerts.component'

@Component({
  selector: 'rangertrak-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSnackBarModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @HostListener('window:beforeinstallprompt', ['$event'])

  private id = "AppComponent"
  title = 'RangerTrak'
  pageDescr = `Track & map Rangers' progress & reports on a mission`

  // https://stackoverflow.com/questions/53871586/angular-catch-beforeinstallprompt-event-add-to-homescreen-in-dev-tools-applic
  deferredPrompt: any;
  showButton = false;


  constructor(
    private log: LogService,
    private updateService: UpdateService,
    private storagePersistence: StoragePersistenceService) {
  }



  ngOnInit() {
    // Request persistent storage once, at app startup, so a mission's
    // localStorage data is protected from silent eviction under storage
    // pressure. PRIVATE-Roadmap.md Section 8/R3. Most browsers grant/deny this
    // based on site-engagement heuristics rather than a user-facing prompt,
    // so there is nothing further to wait on here; the granted/denied
    // result is exposed via storagePersistence.persisted for any screen
    // (e.g. Settings) that wants to surface it.
    this.storagePersistence.requestPersistence()

    // Service-worker update handling lives in UpdateService: detect a new build,
    // tell the user, and activate + reload only when they accept. What was here
    // before built an Observable, never subscribed to it, and then tested the
    // Observable itself for truthiness - so it logged "App Updates ARE Available!"
    // on every single load and never actually updated anything.
    this.updateService.init()
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
