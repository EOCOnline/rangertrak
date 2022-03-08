import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ClockService } from '../services'
//import { FlexLayoutModule } from '@angular/flex-layout';

@Component({
  selector: 'pageHeader',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  public title = 'title'
  public eventInfo = ''
  public dateNow = Date.now()
  public time?: Observable<Date>

  constructor(
    private clockService: ClockService) {
  }

  ngOnInit(): void {
    this.time = this.clockService.getCurrentTime()
  }
  // Layout: https://tburleson-layouts-demos.firebaseapp.com/#/docs
}
