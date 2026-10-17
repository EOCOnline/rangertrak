import { DevicePrefsService } from './device-prefs.service'

describe('DevicePrefsService', () => {
  const keys = ['lastCoordinateFormat', 'rangertrak.rangers.privacyNoticeDismissed', 'rt-board-publisher']
  let prefs: DevicePrefsService

  beforeEach(() => {
    keys.forEach(k => localStorage.removeItem(k))
    prefs = new DevicePrefsService()
  })
  afterEach(() => keys.forEach(k => localStorage.removeItem(k)))

  it('keeps the keys the components used to write, so nothing stored moves', () => {
    prefs.setLastCoordinateFormat('UTM')
    prefs.dismissRangersPrivacyNotice()
    expect(localStorage.getItem('lastCoordinateFormat')).toBe('UTM')
    expect(localStorage.getItem('rangertrak.rangers.privacyNoticeDismissed')).toBe('true')
  })

  it('reads back what it wrote, and defaults when nothing is stored', () => {
    expect(prefs.getLastCoordinateFormat()).toBeNull()
    expect(prefs.isRangersPrivacyNoticeDismissed()).toBeFalse()
    prefs.setLastCoordinateFormat('MGRS')
    expect(prefs.getLastCoordinateFormat()).toBe('MGRS')
    expect(prefs.dismissRangersPrivacyNotice()).toBeTrue()
    expect(prefs.isRangersPrivacyNoticeDismissed()).toBeTrue()
  })

  it('keeps the Board publish key and replaced flag on the device (D-61)', () => {
    expect(prefs.getBoardPublisher()).toEqual({})
    prefs.setBoardPublisher({ base: 'https://b:8080', key: 'k' })
    expect(prefs.getBoardPublisher()).toEqual({ base: 'https://b:8080', key: 'k' })
    prefs.setBoardPublisher({ replaced: true })
    expect(prefs.getBoardPublisher()).toEqual({ replaced: true })
    prefs.setBoardPublisher({})
    expect(localStorage.getItem('rt-board-publisher')).toBeNull()
    localStorage.setItem('rt-board-publisher', '{not json')
    expect(prefs.getBoardPublisher()).toEqual({})
  })

  it('fails safe when storage throws (private browsing, full quota)', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('SecurityError')
    spyOn(Storage.prototype, 'setItem').and.throwError('QuotaExceededError')
    expect(prefs.getLastCoordinateFormat()).toBeNull()
    expect(prefs.isRangersPrivacyNoticeDismissed()).toBeFalse()
    expect(() => prefs.setLastCoordinateFormat('DD')).not.toThrow()
    expect(prefs.dismissRangersPrivacyNotice()).toBeFalse()
  })
})
