import { Component, OnInit } from '@angular/core';
import { faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons';
import { MDCTopAppBar } from '@material/top-app-bar';
//https://material.io/components/app-bars-top/web#regular-top-app-bar

@Component({
  selector: 'rangertrak-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  faMapMarkedAlt = faMapMarkedAlt;

  constructor() {
    const topAppBarElement = document.querySelector('.mdc-top-app-bar');
    if (!topAppBarElement) {
      return
    }
    const topAppBar = new MDCTopAppBar(topAppBarElement);
  }

  ngOnInit(): void {
  }
  Search() {
    console.log("Search is unimplemented yet")
  }
}
