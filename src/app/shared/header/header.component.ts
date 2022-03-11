import { Component, OnInit, Input } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ClockService, SettingsService, LogService, SettingsType } from '../services'
//import { FlexLayoutModule } from '@angular/flex-layout';

@Component({
  selector: 'pageHeader',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Input() parentTitle: string

  private id = 'Header component'
  private settingsSubscription$!: Subscription
  private settings?: SettingsType
  public eventInfo = ''

  public time?: Observable<Date>

  constructor(
    private clockService: ClockService,
    private log: LogService,
    private settingsService: SettingsService,
  ) {

    this.settingsSubscription$ = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.parentTitle = 'a parent title'
  }

  ngOnInit(): void {
    this.time = this.clockService.getCurrentTime()
    this.eventInfo = `${this.settings?.mission}; ${this.settings?.event}`
  }
  // Layout: https://tburleson-layouts-demos.firebaseapp.com/#/docs
}
function Import() {
  throw new Error('Function not implemented.');
}

