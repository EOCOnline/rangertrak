import { Observable, interval } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export class ClockService {

  private clock: Observable<Date>;

  constructor() {
    // TODO: Try Date.now to not create as many Date objects!
    this.clock = interval(1000).pipe(map(() => new Date())
    )
  }
  getCurrentTime() {
    return this.clock;
  }
}
