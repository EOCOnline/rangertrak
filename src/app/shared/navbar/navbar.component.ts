import { CommonModule } from '@angular/common'
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { NavigationEnd, NavigationError, NavigationStart, Router, RouterModule } from '@angular/router';
import { faL, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MDCTopAppBar } from '@material/top-app-bar'
// import { MatButton } from '@angular/material/button'
// import { MatButtonModule } from '@angular/material/button'
import { subscribeOn } from 'rxjs';
import { InstallableService, LogService, SettingsService, SettingsType } from '../services';
import { Utility } from '../utility';
//https://material.io/components/app-bars-top/web#regular-top-app-bar

@Component({
  selector: 'rangertrak-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatProgressBarModule],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  private settings!: SettingsType
  private id = 'Navbar Component'

  /**
   * Reads through to the service, which is the only thing that knows (E-37). A getter
   * rather than a field, because a field initializer runs before the constructor's
   * parameter properties exist, so `this.installableService` would be undefined there.
   */
  get isInstallable(): boolean { return this.installableService.installable() }

  isNavigating = false
  faMapMarkedAlt = faMapMarkedAlt
  recycled = 0

  constructor(
    private log: LogService,
    //private settingsService: SettingsService,
    private installableService: InstallableService,
    private router: Router
  ) {
    this.log.verbose("constructor", this.id)

    this.router.events.subscribe(
      (event) => {
        // https://angular.io/api/router/NavigationStart
        if (event instanceof NavigationStart) {
          // REVIEW: This seems to help page get properly loaded????
          Utility.sleep(100)
          this.isNavigating = true

          if (false) {
            //if (this.recycled++ < 3) {

            Utility.sleep(100)
            this.log.verbose(`Reloading window!`, this.id)
            window.location.reload()
          }
        }
        if (event instanceof NavigationEnd) {
          this.isNavigating = false
        }
        if (event instanceof NavigationError) {
          // https://angular.io/api/router/NavigationError
          this.log.error(`Navigation Error event: to "${event.target?.toString()}" got "${event.toString()}"`, this.id)
          //this.isNavigating = false

        }
      }
    )

    // E-37: `installableEvent` used to start as a truthy `1`, so this set isInstallable
    // true on construction - before any browser had offered installation, and even on a
    // device where the app was already installed. The service owns that state now.

    /* REVIEW: unused?!
    const topAppBarElement = document.querySelector('.mdc-top-app-bar')
    if (!topAppBarElement) {
      console.warn("Navbar Component: no topAppBarElement")
      return
    }
    const topAppBar = new MDCTopAppBar(topAppBarElement)
    */
  }

  ngOnInit(): void {
    this.log.info("ngOnInit", this.id)
  }

  Search() {
    this.log.error("Search: unimplemented yet", this.id)
  }


  async onInstallBtn() {
    this.log.info("User asked to install the app", this.id)
    const outcome = await this.installableService.promptInstall()
    this.log.info(`Install prompt outcome: ${outcome}`, this.id)
  }
}
