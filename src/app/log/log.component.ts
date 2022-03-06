import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core'
import { Subscription, switchMap } from 'rxjs';
import { MatCheckboxModule } from '@angular/material/checkbox'
import { Utility } from "../shared"

import { LogType, LogService, LogLevel, SettingsService } from '../shared/services/';

/**
 * Keep the Log Panel pane synchronized with comments
 *
 */
@Component({
  selector: 'rangertrak-log',
  templateUrl: './log.component.html', //'home.page.html'
  styleUrls: ['./log.component.scss'] //, 'home.page.scss']
})
export class LogComponent { //implements OnInit
  // If this should be a singleton, consider:  https://angular.io/guide/ngmodule-faq#what-is-the-forroot-method

  logPanel: HTMLElement | null
  logSubscription: Subscription
  eventInfo = ''

  // https://material.angular.io/components/checkbox
  verbose = false
  info = true
  warn = true
  error = true


  constructor(
    private logService: LogService,
    @Inject(DOCUMENT) private document: Document) {
    this.logSubscription = logService.getLogObserver().subscribe({
      next: (log) => {
        console.log(log)
        this.gotNewLog(log)
      },
      error: (e) => logService.error('Log subscripotion got:' + e, 'Log Component'),
      complete: () => logService.info('Log Subscription complete', 'Log Component')
    })

    this.logPanel = this.document.getElementById("log")
    if (this.logPanel === null) { throw ("unable to find log panel...") }
  }

  /**
   * Create heading for Log Panel
   */
  ngOnInit(): void {
    this.eventInfo = `Event: ; Mission: ; Op Period: ; Date ${Date.now}`
  }
  /**
   *
   * @param v
   */
  gotNewLog(log: LogType[]) {
    if (this.logPanel === null) { throw ("unable to find log panel...") }

    log.forEach(entry => {
      let time = Utility.zeroFill(entry.date.getHours(), 2) + ":" + Utility.zeroFill(entry.date.getMinutes(), 2) + ":" + Utility.zeroFill(entry.date.getSeconds(), 2) + ":" + Utility.zeroFill(entry.date.getMilliseconds(), 4)
      switch (entry.level) {
        case LogLevel.Verbose:
          if (this.verbose) {
            this.logPanel!.innerHTML += `<span class="${entry.level}">${time} - ${entry.source}:  ${entry.msg}</span> \n`
          }
          break;

        case LogLevel.Info:
          if (this.info) {
            this.logPanel!.innerHTML += `<span class="${entry.level}">${time} - ${entry.source}:  ${entry.msg}</span> \n`
          }
          break;

        case LogLevel.Warn:
          if (this.warn) {
            this.logPanel!.innerHTML += `<span class="${entry.level}">${time} - ${entry.source}:  ${entry.msg}</span> \n`
          }
          break;

        case LogLevel.Error:
          if (this.error) {
            this.logPanel!.innerHTML += `<span class="${entry.level}">${time} - ${entry.source}:  ${entry.msg}</span> \n`
          }
          break;
      }
    })

    let ot = this.logPanel.scrollHeight - this.logPanel.clientHeight
    if (ot > 0) this.logPanel.scrollTop = ot
  }
}
