import { Component, OnInit } from '@angular/core';
import { faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'rangertrak-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  faMapMarkedAlt = faMapMarkedAlt;
  constructor() { }

  ngOnInit(): void {
  }

}
