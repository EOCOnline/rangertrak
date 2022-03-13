export enum LogLevel { Verbose, Info, Warn, Error }
export type LogType = {
  date: Date,
  msg: string,
  level: LogLevel,
  source: string
}
