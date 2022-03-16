// / <reference types= @types/picocolors /> - gets: Cannot find type definition file for '@types/picocolors'.
import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { Utility } from '../utility'
import pc from "picocolors" // https://github.com/alexeyraspopov/picocolors
import { LogType, LogLevel } from '.'

@Injectable({ providedIn: 'root' })
export class LogService {

  private Log: LogType[] = []
  private logSubject$: BehaviorSubject<LogType[]>
  private defaultSource = 'Unknown'

  constructor() {
    console.log(pc.green(`==== Log ${pc.bgRed('Service')} ${pc.italic('Construction')} ====`))

    let initialEntry = {
      date: new Date, msg: 'Log Service is being constructed',
      level: LogLevel.Verbose, source: 'LogService'
    }
    this.logSubject$ = new BehaviorSubject([initialEntry])
  }

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
    switch (level) {
      case LogLevel.Verbose:
        console.log(pc.blue(`${time} - From ${source} - ${msg}`))
        break;

      case LogLevel.Info:
        console.log(pc.bgCyan(`${time} - From ${source} - ${msg}`))
        break;

      case LogLevel.Warn:
        console.warn(`${time} - From ${source} - ${msg}`)
        break;

      case LogLevel.Error:
        console.error(pc.red(pc.bold(`${time} - From ${source} - ${msg}`)))
        break;

      default:
        console.error(`Unknown level!`)
        console.error(`${time} - From ${source} - ${msg}`)
        break;
    }
    this.Log.push({ date: new Date, msg: msg, level: level, source: source })
    this.logSubject$.next(this.Log)  //? Review: we republish the entire log, not just the next entry: ?????
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
