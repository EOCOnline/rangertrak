import { provideHttpClient } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'

import { MISSION_ZIP_SCHEMA_VERSION, MissionZipManifest } from '../shared/export/mission-zip'
import { MissionLocationService, MissionService, RangerService } from '../shared/services'
import { RangerPhotoService } from '../shared/services/ranger-photo.service'
import { UnknownRanger } from '../shared/services/ranger.interface'

import { PrepComponent } from './prep.component'

/**
 * Finishing checklist gap #2 (2026-08-31) - this component's real risk surface is data
 * mutation on apply (settings/rangers/locations/photos all get REPLACED at once), not the
 * build-a-download-link mechanics `onBtnBuildZip()` shares with every other export button in
 * the app and which nothing else here tests either. So these specs cover onBtnApplyPending()
 * only: a cancelled confirm() must mutate nothing, and a confirmed one must apply everything
 * the confirm dialog promised - including clearing stale photos first (gap #8) and surfacing
 * rosterWarnings() before the operator commits (gap #7).
 */
describe('PrepComponent', () => {
  let fixture: ComponentFixture<PrepComponent>
  let component: PrepComponent
  let rangerService: RangerService
  let missionService: MissionService
  let locationService: MissionLocationService
  let photos: RangerPhotoService

  /**
   * `window.location.reload` is a non-configurable native method in Chrome, so plain
   * `spyOn(window.location, 'reload')` throws ("not declared writable or has no setter")
   * rather than stubbing it - and the real thing would tear down the Karma page mid-suite.
   * Shadowing `location` itself with a plain object (its OWN descriptor on `window` IS
   * configurable) sidesteps that without touching production code, which calls
   * `window.location.reload()` directly the same way every other export/import component in
   * this app does.
   */
  const manifest = (over: Partial<MissionZipManifest> = {}): MissionZipManifest => ({
    schemaVersion: MISSION_ZIP_SCHEMA_VERSION,
    exportedAt: '2026-08-31T00:00:00.000Z',
    appVersion: '0.90.0',
    settings: { mission: 'Applied Mission' } as any,
    rangers: [{ ...UnknownRanger, callsign: 'AP1', id: 'REW-9' }],
    locations: [{ name: 'Command Post', type: 'Command Post', lat: 47.4, lng: -122.4 }],
    ...over,
  })

  beforeEach(async () => {
    localStorage.clear()
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] })
    fixture = TestBed.createComponent(PrepComponent)
    component = fixture.componentInstance
    rangerService = TestBed.inject(RangerService)
    missionService = TestBed.inject(MissionService)
    locationService = TestBed.inject(MissionLocationService)
    photos = TestBed.inject(RangerPhotoService)
    await photos.whenReady()
    await photos.clear()
  })

  afterEach(async () => {
    localStorage.clear()
    await photos.clear()
  })

  describe('onBtnApplyPending', () => {
    it('mutates nothing when the confirmation is cancelled', async () => {
      const before = rangerService.rangers.length
      component.pending.set({ manifest: manifest(), photos: [] })
      spyOn(window, 'confirm').and.returnValue(false)

      await component.onBtnApplyPending()

      expect(rangerService.rangers.length).toBe(before)
      expect(missionService.settings.mission).not.toBe('Applied Mission')
    })

    it('replaces rangers, settings, and locations, and clears stale photos before importing new ones', async () => {
      // A photo under a callsign the incoming Mission Zip does NOT carry - simulates a prior
      // roster's leftover photo, the exact case gap #8 exists to stop from silently misleading.
      const staleFile = new File([new Blob(['stale'], { type: 'image/jpeg' })], 'STALE.jpg', { type: 'image/jpeg' })
      await photos.importFiles([staleFile], [{ callsign: 'STALE' }])
      expect(photos.photoUrl({ callsign: 'STALE' })).toContain('blob:')

      component.pending.set({
        manifest: manifest(),
        photos: [{ filename: 'REW-9.jpg', bytes: new TextEncoder().encode('new-photo-bytes') }],
      })
      spyOn(window, 'confirm').and.returnValue(true)
      spyOn(window, 'alert')
      spyOn(component, 'reloadPage')

      await component.onBtnApplyPending()

      expect(rangerService.rangers.length).toBe(1)
      expect(rangerService.rangers[0].callsign).toBe('AP1')
      expect(missionService.settings.mission).toBe('Applied Mission')
      expect(locationService.getCurrentLocations().length).toBe(1)
      expect(locationService.getCurrentLocations()[0].name).toBe('Command Post')

      expect(photos.photoUrl({ callsign: 'STALE' })).toBe('')
      expect(photos.photoUrl({ id: 'REW-9' })).toContain('blob:')
    })

    it('defaults locations to empty when the manifest predates D-49', async () => {
      const { locations: _omitted, ...withoutLocations } = manifest()
      component.pending.set({ manifest: withoutLocations as MissionZipManifest, photos: [] })
      spyOn(window, 'confirm').and.returnValue(true)
      spyOn(window, 'alert')
      spyOn(component, 'reloadPage')

      await component.onBtnApplyPending()

      expect(locationService.getCurrentLocations()).toEqual([])
    })

    it('surfaces rosterWarnings for the incoming roster in the confirm dialog', async () => {
      const withDuplicates = manifest({
        rangers: [
          { ...UnknownRanger, callsign: 'DUP', id: 'REW-1' },
          { ...UnknownRanger, callsign: 'DUP', id: 'REW-2' },
        ],
      })
      component.pending.set({ manifest: withDuplicates, photos: [] })
      const confirmSpy = spyOn(window, 'confirm').and.returnValue(false)

      await component.onBtnApplyPending()

      expect(confirmSpy).toHaveBeenCalled()
      const [message] = confirmSpy.calls.mostRecent().args
      expect(message).toContain('duplicate callsign');
      expect(message).toContain('DUP')
    })
  })

  describe('onCancelPending', () => {
    it('clears the pending preview', () => {
      component.pending.set({ manifest: manifest(), photos: [] })
      component.onCancelPending()
      expect(component.pending()).toBeNull()
    })
  })
})
