import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Utility } from '../utility';

export enum LogLevel { Verbose, Info, Warn, Error }
export type LogType = {
  date: Date,
  msg: string,
  level: LogLevel,
  source: string
}

@Injectable({ providedIn: 'root' })
export class LogService {

  private Log: LogType[] = []
  private logSubject: BehaviorSubject<LogType[]>
  private defaultSource = 'Unknown'

  constructor() {
    let initialEntry = {
      date: new Date, msg: 'Log Service is being constructed',
      level: LogLevel.Verbose, source: 'LogService'
    }
    this.logSubject = new BehaviorSubject([initialEntry])
  }

  // compare to functionality of https://developer.mozilla.org/en-US/docs/Web/API/console
  log(msg: string, source: string = this.defaultSource, level: LogLevel = LogLevel.Info) {
    let dt = new Date
    let time = Utility.zeroFill(dt.getHours(), 2) + ":" + Utility.zeroFill(dt.getMinutes(), 2) + ":" + Utility.zeroFill(dt.getSeconds(), 2) + ":" + Utility.zeroFill(dt.getMilliseconds(), 4)
    switch (level) {
      case LogLevel.Verbose:
      case LogLevel.Info:
        console.log(`${time} - From ${source} - ${msg}`)
        break;

      case LogLevel.Warn:
        console.warn(`${time} - From ${source} - ${msg}`)
        break;

      case LogLevel.Error:
        console.error(`${time} - From ${source} - ${msg}`)
        break;

      default:
        console.error(`Unknown level!`)
        console.error(`${time} - From ${source} - ${msg}`)
        break;
    }
    this.Log.push({ date: new Date, msg: msg, level: level, source: source })
    this.logSubject.next(this.Log)  //? Review: we republish the entire log, not just the next entry: ?????
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
    return this.logSubject.asObservable()
  }
}
