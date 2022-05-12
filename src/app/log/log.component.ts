import { Subscription, switchMap } from 'rxjs'

import { DOCUMENT } from '@angular/common'
import { AfterContentInit, Component, Inject, OnDestroy, OnInit } from '@angular/core'
import { MatCheckboxModule } from '@angular/material/checkbox'
import {
    faBug, faCircleCheck, faCircleExclamation, faCircleInfo, faMapMarkedAlt
} from '@fortawesome/free-solid-svg-icons'

import { Utility } from '../shared'
import { LogLevel, LogService, LogType, SettingsService, SettingsType } from '../shared/services/'

/**
 * Update the Log Panel pane with notifications
 *
 */
@Component({
  selector: 'rangertrak-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent implements OnInit, OnDestroy, AfterContentInit, OnInit {
  // REVIEW: If this should be a singleton, consider:  https://angular.io/guide/ngmodule-faq#what-is-the-forroot-method
  private id = 'Log Component'
  public title = 'Event Summary Log'
  private logPanel: HTMLElement | null = null
  private logSubscription: Subscription
  private settingsSubscription!: Subscription
  private settings!: SettingsType

  private latestLog: LogType[] = []

  // https://material.angular.io/components/checkbox
  public excessive = false
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
    console.log(`Constructing log component`)

    this.logSubscription = logService.getLogObserver().subscribe({
      next: (log) => {
        //console.log(`LogPanel got: ${JSON.stringify(log)}`)
        this.latestLog = log
        this.gotNewLog(log)
      },
      error: (e) => console.error('Log Subscription got:' + e, this.id),
      complete: () => console.info('Log Subscription complete', this.id)
    })

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
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
    //console.log(`Into log component's ngInit`)

    this.logPanel = this.document.getElementById("log")
    if (this.logPanel) {
      // YES!
      console.log(`ngOnInit() found logPanel.`)
      this.redisplayLog()
    } else {
      console.error('logPanel not found in ngOnInit(). Move code later!');
    }
  }

  ngAfterContentInit() {
    //console.log(`Into log component's ngAfterContentInit`)

    this.logPanel = this.document.getElementById("log")
    if (this.logPanel) {
      // YES!
      console.log(`ngAfterContentInit() found logPanel.`)
      this.redisplayLog()
    } else {
      console.error('logPanel not found in ngAfterContentInit(). Move code later!');
    }
  }


  redisplayLog() {
    console.log(`Display log with ${this.excessive ? 'excessive, ' : 'only '}${this.verbose ? 'verbose, ' : ''}${this.info ? 'info, ' : ''}${this.warn ? 'warnings, ' : ''}${this.error ? 'errors ' : ''}`)
    this.gotNewLog(this.latestLog)
  }

  /**
   * If you have to display reserved characters such as <, >, &, " within the <pre> tag,
   * the characters must be escaped using their respective HTML entity.
   */
  gotNewLog(log: LogType[]) {
    //console.log(`got new log with ${log.length} entries`)

    let i = 0
    let msMaxDelay = 2000
    while (!this.logPanel) {
      setTimeout(() => {
        console.error(`gotNewLog asked to display the logs BEFORE logPanel initialization. Delayed ${i / 10 * msMaxDelay} ms. Retrying.`) // For: \n${JSON.stringify(log.slice(-1))} `)
        this.logPanel = this.document.getElementById("log")
      }, msMaxDelay / 10)
      if (++i > 9) {
        return
        //throw ("log panel undefined...")
        //break
      }
    }

    if (this.logPanel == null) {
      console.error('this.logPanel is null...')
      return
    }

    if (this.logPanel == undefined) {
      console.error('this.logPanel is undefined...')
      return
    }

    if (this.logPanel.innerHTML == null) {
      console.error('this.logPanel.innerHTML is null...')
      return
    }


    if (this.logPanel.innerHTML == undefined) {
      console.error('this.logPanel.innerHTML is undefined...')
      return
    }

    // TODO: rebuilds entire log panel, instead of just pushing last few entries onto it...
    this.logPanel.innerHTML = ''

    log.forEach(entry => {
      let time = entry.date.getHours().toString().padStart(2, '0') + ":" + entry.date.getMinutes().toString().padStart(2, '0') + ":" + entry.date.getSeconds().toString().padStart(2, '0') + "." + entry.date.getMilliseconds().toString().padStart(3, '0')
      let preface = `<span class="tiny">${entry.source}: </span>` //`<span class="tiny"> ${time} - ${entry.source}:  </span>`

      if (!this.logPanel) { return }

      switch (entry.level) {

        case LogLevel.Excessive:
          if (this.excessive) {
            // BUG: Classes and id's show up in debugger, but font-sizes & colors don't get calculated/are ineffective!
            this.logPanel.innerHTML += `<i class="fa-solid fa-circle-check"></i><span class="excessive">${preface}${entry.msg}</span><br>`
          }
          break;

        case LogLevel.Verbose:
          if (this.verbose) {
            // BUG: Classes and id's show up in debugger, but font-sizes & colors don't get calculated/are ineffective!
            this.logPanel.innerHTML += `<i class="fa-solid fa-circle-check"></i><span class="verbose">${preface}${entry.msg}</span><br>`
          }
          break;

        case LogLevel.Info:
          if (this.info) {
            this.logPanel.innerHTML += `<fa-icon [icon]="fa-circle-info"></fa-icon><span class="info" style="background-color:yellow;">${preface}${entry.msg}</span><br>`
          }
          break;

        case LogLevel.Warn:
          if (this.warn) {
            this.logPanel.innerHTML += `<i class="fa-solid fa-circle-exclamation"></i><span class="warn" style="background-color:orange;"">${preface}${entry.msg}</span><br>`
          }
          break;

        case LogLevel.Error:
          if (this.error) {
            this.logPanel.innerHTML += `<i class="fa-solid fa-bug"></i><span class="error" style="background-color:red;">${preface}${entry.msg}</span><br>`
          }
          break;

        default:
          this.logPanel.innerHTML += `<i class="fa-solid fa-bug"></i><span class="error" style="background-color:salmon;">UNEXPECTED LOG TYPE: ${preface}${entry.msg}</span><br>`
      }
    })

    let ot = this.logPanel.scrollHeight - this.logPanel.clientHeight
    if (ot > 0) this.logPanel.scrollTop = ot
  }


  ngOnDestroy() {
    this.settingsSubscription.unsubscribe()
  }
}
