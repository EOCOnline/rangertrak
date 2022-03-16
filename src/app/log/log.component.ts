import { DOCUMENT } from '@angular/common';
import { AfterContentInit, AfterViewInit, Component, Inject, OnDestroy, OnInit } from '@angular/core'
import { Subscription, switchMap } from 'rxjs';
import { MatCheckboxModule } from '@angular/material/checkbox'
import { Utility } from "../shared"
import { faMapMarkedAlt, faCircleInfo, faCircleCheck, faCircleExclamation, faBug } from '@fortawesome/free-solid-svg-icons';
import { LogType, LogService, LogLevel, SettingsService, SettingsType } from '../shared/services/';

/**
 * Update the Log Panel pane with notifications
 *
 */
@Component({
  selector: 'rangertrak-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent implements OnInit, OnDestroy { //}, AfterContentInit, AfterViewInit {
  // REVIEW: If this should be a singleton, consider:  https://angular.io/guide/ngmodule-faq#what-is-the-forroot-method
  private id = 'Log Component'
  public title = 'Event Summary Log'
  private logPanel: HTMLElement | null = null
  private logSubscription: Subscription
  private settingsSubscription$!: Subscription
  private settings?: SettingsType

  private latestLog: LogType[] = []

  // https://material.angular.io/components/checkbox
  public verbose = true
  public info = true
  public warn = true
  public error = true
  faCircleInfo = faCircleInfo
  faCircleCheck = faCircleCheck
  faCircleExclamation = faCircleExclamation
  faBug = faBug

  constructor(
    private logService: LogService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {
    console.log(`Constructing log compoennt`)

    this.logSubscription = logService.getLogObserver().subscribe({
      next: (log) => {
        //console.log(`LogPanel got: ${JSON.stringify(log)}`)
        this.latestLog = log
        this.gotNewLog(log)
      },
      error: (e) => console.error('Log Subscription got:' + e, this.id),
      complete: () => console.info('Log Subscription complete', this.id)
    })
    this.settingsSubscription$ = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
      },
      error: (e) => console.error('Settings Subscription got:' + e, this.id),
      complete: () => console.info('Settings Subscription complete', this.id)
    })
  }

  /**
   * Create heading for Log Panel
   */
  ngOnInit(): void {
    console.log(`Into log component's ngInit`)


    this.logPanel = this.document.getElementById("log")
    if (this.logPanel) {
      // YES!
      console.log(`ngOnInit() found logPanel.`)
      this.redisplayLog()
    }
  }
  /*
    ngAfterContentInit() {
      this.logPanel = this.document.getElementById("log")
      if (this.logPanel) {
        // YES!
        console.log(`ngAfterContentInit() found logPanel.`)
        this.redisplayLog()
      }
    }

    ngAfterViewInit() {
      this.logPanel = this.document.getElementById("log")
      if (this.logPanel) {
        console.log(`ngAfterViewInit() found logPanel.`)
        this.redisplayLog()
      }
    }
  */
  redisplayLog() {
    console.log(`redisplay log with only ${this.verbose ? 'verbose, ' : ''}${this.info ? 'info, ' : ''}${this.warn ? 'warnings, ' : ''}${this.error ? 'errors ' : ''}`)
    this.gotNewLog(this.latestLog)
  }

  /**
   * If you have to display reserved characters such as <, >, &, " within the <pre> tag,
   * the characters must be escaped using their respective HTML entity.
   */
  gotNewLog(log: LogType[]) {
    console.log(`got new log with ${log.length} entries`)

    this.logPanel = this.document.getElementById("log")
    if (this.logPanel === null) {
      console.warn(`Asked to display the logs BEFORE the logPanel could be initialized. Will retry. For: \n${JSON.stringify(log.slice(-1))} `)
      //  TODO: Retry after a second or it's otherwise created...
      return
    }
    if (this.logPanel == undefined) { throw ("log panel undefined...") }

    this.logPanel.innerHTML = ''
    log.forEach(entry => {
      let time = entry.date.getHours().toString().padStart(2, '0') + ":" + entry.date.getMinutes().toString().padStart(2, '0') + ":" + entry.date.getSeconds().toString().padStart(2, '0') + "." + entry.date.getMilliseconds().toString().padStart(3, '0')
      if (!this.logPanel) { return }

      switch (entry.level) {
        case LogLevel.Verbose:
          if (this.verbose) {
            // BUG: Classes and id's show up in debugger, but font-sizes & colors don't get calculated/are ineffective!
            this.logPanel.innerHTML += `<i class="fa-solid fa-circle-check"></i><span class="verbose"><span id="tiny"> ${time} - ${entry.source}:  </span>${entry.msg}</span><br>`
          }
          break;

        case LogLevel.Info:
          if (this.info) {
            this.logPanel.innerHTML += `<fa-icon [icon]="fa-circle-info"></fa-icon><span class="info"><span class="tiny" id="tiny2"> ${time} - ${entry.source}:  </span>${entry.msg}</span><br>`
          }
          break;

        case LogLevel.Warn:
          if (this.warn) {
            this.logPanel.innerHTML += `<i class="fa-solid fa-circle-exclamation"></i><span class="${entry.level}"><span class="tiny"> ${time} - ${entry.source}:  </span>${entry.msg}</span><br>`
          }
          break;

        case LogLevel.Error:
          if (this.error) {
            this.logPanel.innerHTML += `<i class="fa-solid fa-bug"></i><span class="${entry.level}"><span class="tiny"> ${time} - ${entry.source}:  </span>${entry.msg}</span><br>`
          }
          break;
      }
    })

    let ot = this.logPanel.scrollHeight - this.logPanel.clientHeight
    if (ot > 0) this.logPanel.scrollTop = ot
  }


  ngOnDestroy() {
    this.settingsSubscription$.unsubscribe()
  }
}
