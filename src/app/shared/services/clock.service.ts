import { Injectable, Optional, SkipSelf } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ClockService {

  private clock$: Observable<Date>;

  constructor(
    @Optional() @SkipSelf() existingService: ClockService,
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


    // TODO: Try Date.now to not create as many Date objects!
    // instead of using new Date().getTime():number use Date.now():number so you don't make new objects unnecessarily
    //this.clock = interval(1000).pipe(map(() => new Date())
    //
    // E-44 audit follow-up, 2026-08-26: was interval(1000), same delayed-first-emission bug
    // as header.component.ts's timeElapsed$/timeLeft$ (see that file's comment) - the
    // header's .clock span rendered empty for a full second before this ever emitted.
    // timer(0, 1000) emits immediately on subscription instead.
    this.clock$ = timer(0, 1000)
      .pipe(map(() => new Date()))
  }
  getCurrentTime() {
    return this.clock$;
  }
}
