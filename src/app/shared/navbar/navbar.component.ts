import { CommonModule } from '@angular/common'
import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core'
import { NavigationEnd, NavigationError, NavigationStart, Router, RouterModule } from '@angular/router';
import { faL, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MDCTopAppBar } from '@material/top-app-bar'
// import { MatButton } from '@angular/material/button'
// import { MatButtonModule } from '@angular/material/button'
import { subscribeOn } from 'rxjs';
import { LogService, MissionService, MissionType, ThemeService } from '../services';
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

  private settings!: MissionType
  private id = 'Navbar Component'

  // Mutated inside a raw this.router.events.subscribe() callback, not an Angular
  // template binding - this app is zoneless, so a plain field written there has no
  // guaranteed path back into change detection. Signals close that gap (Sprint G).
  // Rendered on every page.
  isNavigating = signal(false)
  faMapMarkedAlt = faMapMarkedAlt
  recycled = 0

  constructor(
    private log: LogService,
    //private missionService: MissionService,
    private router: Router,
    protected theme: ThemeService
  ) {
    this.log.verbose("constructor", this.id)

    this.router.events.subscribe(
      (event) => {
        // https://angular.io/api/router/NavigationStart
        if (event instanceof NavigationStart) {
          // REVIEW: This seems to help page get properly loaded????
          Utility.sleep(100)
          this.isNavigating.set(true)

          if (false) {
            //if (this.recycled++ < 3) {

            Utility.sleep(100)
            this.log.verbose(`Reloading window!`, this.id)
            window.location.reload()
          }
        }
        if (event instanceof NavigationEnd) {
          this.isNavigating.set(false)
        }
        if (event instanceof NavigationError) {
          // https://angular.io/api/router/NavigationError
          this.log.error(`Navigation Error event: to "${event.target?.toString()}" got "${event.toString()}"`, this.id)
          //this.isNavigating.set(false)

        }
      }
    )

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
}
