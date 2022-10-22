
import { TestBed } from '@angular/core/testing';

import { Utility } from './utility';

describe('Utility', () => {
  let util: Utility;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    //    service = TestBed.inject(InstallableService);
  });

  // Utility is currently ALL static functinos - do we really need an actual instance of it?!
  it('should be created', () => {
    expect(util).toBeTruthy();
  });

  timetest()

});

function timetest() {
  const now = new Date()
  const msNow = now.getTime()
  const msPerHour = 1000 * 60 * 60
  const perfectDiff = { days: 0, hours: -18, minutes: 0, seconds: 0 }
  let offsetHours = -18

  let ms: any = new Date(msNow + (msPerHour * offsetHours))

  let diff = Utility.timeDiff(msNow, ms)
  //  console.info(`Days = ${diff.days} and ${diff.hours}:${diff.minutes}:${diff.seconds}`)
  expect(diff == perfectDiff)
}

