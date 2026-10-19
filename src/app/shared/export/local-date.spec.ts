import { localDateStamp, localDateTimeStamp } from './local-date'

describe('local-date', () => {
  it('names the device-local calendar day, not the UTC one', () => {
    // 8:46 PM on the 18th in this device's zone is the 19th (or later) in UTC for any zone west of UTC.
    const evening = new Date(2026, 9, 18, 20, 46)
    expect(localDateStamp(evening)).toBe('2026-10-18')
    expect(localDateTimeStamp(evening)).toBe('20261018-2046')
  })

  it('accepts an ISO string and pads single digits', () => {
    const d = new Date(2026, 0, 5, 3, 7)
    expect(localDateStamp(d.toISOString())).toBe('2026-01-05')
    expect(localDateTimeStamp(d.toISOString())).toBe('20260105-0307')
  })
})
