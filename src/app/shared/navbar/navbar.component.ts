import { Component, OnInit } from '@angular/core'
import { NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { faL, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { MDCTopAppBar } from '@material/top-app-bar'
// import { MatButton } from '@angular/material/button'
// import { MatButtonModule } from '@angular/material/button'
import { subscribeOn } from 'rxjs';
import { InstallableService, LogService, SettingsService, SettingsType } from '../services';
import { Utility } from '../utility';
//https://material.io/components/app-bars-top/web#regular-top-app-bar

@Component({
  selector: 'rangertrak-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  private settings!: SettingsType
  private id = 'Navbar Component'

  isInstallable = false
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

    if (installableService.installableEvent) {
      this.isInstallable = true
    }

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

  onInstallBtn() {
    this.log.info("User wants to install app!"), this.id

    // From Angular Cookbook, pg 592
    // https://web.dev/customize-install
    // https://github.com/WICG/manifest-incubations

    //! TODO: Implement me!!!
  }
}
