import pc from 'picocolors' // https://github.com/alexeyraspopov/picocolors
import { BehaviorSubject, Observable, throwError } from 'rxjs'

// / <reference types= @types/picocolors /> - gets: Cannot find type definition file for '@types/picocolors'.
import { Injectable, Optional, SkipSelf } from '@angular/core'

import { Utility } from '../utility'
import { LogLevel, LogType } from './'

// Additional ideas: https://www.codemag.com/Article/1711021/Logging-in-Angular-Applications

@Injectable({ providedIn: 'root' })
export class LogService {

  private Log: LogType[] = []
  private logSubject$: BehaviorSubject<LogType[]>
  private defaultSource = 'Unknown'
  static nextId = 1
  //const colors = require('colors/safe');
  readonly hotStylin = 'background-color: darkblue; color: white; font-style: italic; border: 5px solid hotpink; font-size: 2em;'


  constructor(
    @Optional() @SkipSelf() existingService: LogService,
  ) {
    if (existingService) {
      /**
       * see https://angular.io/guide/singleton-services
       * Use @Optional() @SkipSelf() in singleton constructors to ensure
       * future modules don't provide extra copies of this singleton service
       * per pg 84 of Angular Cookbook: do NOT add services to *.module.ts!
       */
      throwError(() => {
        console.error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
        new Error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
      })
    }
    console.log(pc.green(`==== Log ${pc.red('Service')} ${pc.italic('Construction')} ====`))

    let initialEntry = {
      date: new Date, msg: 'Log Service is being constructed',
      level: LogLevel.Verbose, source: 'LogService'
    }
    this.logSubject$ = new BehaviorSubject([initialEntry])
  }

  // const style = 'background-color: darkblue; color: white; font-style: italic; border: 5px solid hotpink; font-size: 2em;'
  // console.log("%cHooray", style);
  // https://developer.chrome.com/docs/devtools/console/format-style/#style-console-messages

  // compare to functionality of https://developer.mozilla.org/en-US/docs/Web/API/console
  // Chrome console formatting: https://developer.chrome.com/docs/devtools/console/format-style/
  // https://www.npmjs.com/package/chalk

  // https://github.com/alexeyraspopov/picocolors
  // black, red, green, yellow, blue, magenta, cyan, white, gray
  // bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite
  // dim, bold, hidden, italic, underline, strikethrough, reset, inverse
  log(msg: string, source: string = this.defaultSource, level: LogLevel = LogLevel.Info) {

    let dt = new Date
    let time = Utility.zeroFill(dt.getHours(), 2) + ":" + Utility.zeroFill(dt.getMinutes(), 2) + ":" + Utility.zeroFill(dt.getSeconds(), 2) + ":" + Utility.zeroFill(dt.getMilliseconds(), 4)

    let preface = `${LogService.nextId++}: ` // `${time} - From `

    switch (level) {

      case LogLevel.Excessive:
        // BUG: %c not getting interpreted...
        //console.log(pc.red(`%c${preface}${source}: ${msg}`))
        console.log(pc.red(`${preface}${source}: ${msg}`))
        break;

      case LogLevel.Verbose:
        // TODO: console.log(pc.blue(`${preface}${source}: ${msg}`), hotStylin)
        // results in:  Header component: New settings received background-color: darkblue; color: white; font-style: italic; border: 5px solid hotpink; font-size: 2em;
        console.log(pc.blue(`${preface}${source}: ${msg}`))
        break;

      case LogLevel.Info:
        console.log(pc.cyan(`${preface}${source}: ${msg}`))
        break;

      case LogLevel.Warn:
        console.warn(`${preface}${source}: ${msg}`)
        break;

      case LogLevel.Error:
        console.error(pc.red(pc.bold(`${preface}${source}: ${msg}`)))
        break;

      default:
        console.error(`Unknown level = ${level}!`)
        console.error(`${preface}${source}: ${msg}`)
        break;
    }
    this.Log.push({ date: new Date, msg: msg, level: level, source: source })
    this.logSubject$.next(this.Log)  //? Review: we republish the entire log, not just the next entry: ?????
  }

  excessive(msg: string, source: string = this.defaultSource) {
    this.log(msg, source, LogLevel.Excessive)
  }

  verbose(msg: string, source: string = this.defaultSource) {
    this.log(msg, source, LogLevel.Verbose)
  }

  info(msg: string, source: string = this.defaultSource) {
    this.log(msg, source, LogLevel.Info)
  }

  warn(msg: string, source: string = this.defaultSource) {
    this.log(msg, source, LogLevel.Warn)
  }

  error(msg: string, source: string = this.defaultSource) {
    this.log(msg, source, LogLevel.Error)
  }

  getLogObserver(): Observable<LogType[]> {
    return this.logSubject$.asObservable()
  }
}
