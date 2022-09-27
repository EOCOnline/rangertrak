import { Component, OnInit } from '@angular/core'
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { MDCTopAppBar } from '@material/top-app-bar'
import { subscribeOn } from 'rxjs';
//https://material.io/components/app-bars-top/web#regular-top-app-bar

@Component({
  selector: 'rangertrak-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  isNavigating = false
  faMapMarkedAlt = faMapMarkedAlt

  constructor(private router: Router) {
    this.router.events.subscribe(
      (event) => {
        if (event instanceof NavigationStart) {
          this.isNavigating = true
        }
        if (event instanceof NavigationEnd) {
          this.isNavigating = false
        }
      }
    )
    const topAppBarElement = document.querySelector('.mdc-top-app-bar')
    if (!topAppBarElement) {
      return
    }
    const topAppBar = new MDCTopAppBar(topAppBarElement)
  }

  ngOnInit(): void {
  }
  Search() {
    console.log("Search is unimplemented yet")
  }
}
