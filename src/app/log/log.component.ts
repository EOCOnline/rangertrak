import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core'
import { Subscription, switchMap } from 'rxjs';
import { MatCheckboxModule } from '@angular/material/checkbox'
import { Utility } from "../shared"

import { LogType, LogService, LogLevel, SettingsService } from '../shared/services/';

/**
 * Update the Log Panel pane with notifications
 *
 */
@Component({
  selector: 'rangertrak-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent { //implements OnInit
  // REVIEW: If this should be a singleton, consider:  https://angular.io/guide/ngmodule-faq#what-is-the-forroot-method
  private id = 'Log Component'
  private logPanel: HTMLElement | null
  private logSubscription: Subscription
  public eventInfo = ''

  // https://material.angular.io/components/checkbox
  public verbose = false
  public info = true
  public warn = true
  public error = true


  constructor(
    private logService: LogService,
    @Inject(DOCUMENT) private document: Document) {
    this.logSubscription = logService.getLogObserver().subscribe({
      next: (log) => {
        console.log(`LogPanel got: ${log}`) //! REMOVE ME!
        this.gotNewLog(log)
      },
      error: (e) => console.error('Log Subscription got:' + e, this.id),
      complete: () => console.info('Log Subscription complete', this.id)
    })

    this.logPanel = this.document.getElementById("log")
    if (this.logPanel === null) { throw ("unable to find log panel...") }
  }

  /**
   * Create heading for Log Panel
   */
  ngOnInit(): void {
    this.eventInfo = `Event: ; Mission: ; Op Period: ; Date ${new Date}`
  }
  /**
   *
   * @param v
   */
  gotNewLog(log: LogType[]) {
    if (this.logPanel === null) { throw ("unable to find log panel...") }
    console.log('New log entry received!')
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
