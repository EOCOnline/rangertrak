import { Component, OnInit, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { ClockService, SettingsService, LogService } from '../services'
//import { FlexLayoutModule } from '@angular/flex-layout';

@Component({
  selector: 'pageHeader',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Input() parentTitle: string

  private id = 'Header component'
  public eventInfo = ''
  public dateNow = Date.now()
  public time?: Observable<Date>

  constructor(
    private clockService: ClockService,
    private log: LogService,
    private settingsService: SettingsService,
  ) {
    this.parentTitle = 'a parent title'
  }

  ngOnInit(): void {
    this.time = this.clockService.getCurrentTime()
    this.eventInfo = SettingsService.Settings.name.split("\n")[0]
  }
  // Layout: https://tburleson-layouts-demos.firebaseapp.com/#/docs
}
function Import() {
  throw new Error('Function not implemented.');
}

