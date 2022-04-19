import { Component, OnInit } from '@angular/core';
// TODO: https://bobrov.dev/blog/angular-smart-404-page/

@Component({
  selector: 'rangertrak-x404',
  templateUrl: './x404.component.html',
  styleUrls: ['./x404.component.scss']
})
export class X404Component implements OnInit {
  public title = 'You are seeking a web page that does not yet exist!'
  constructor() { }

  ngOnInit(): void {
  }

}
