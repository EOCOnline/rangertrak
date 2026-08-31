import { unzipSync, zipSync, Zippable } from 'fflate'

import { MissionType } from '../services/mission.interface'
import { RangerType } from '../services/ranger.interface'

/**
 * E-109 Mission Zip, v1 (2026-08-31, ADR D-48). A PRE-mission template artifact - settings +
 * roster + photos, collapsing what today takes three separate imports (roster JSON, then
 * photos, then a mission JSON) into one file a coordinator hands to a scribe before a
 * mission starts.
 *
 * Deliberately NOT the same shape as `BackupService.MissionExport` (see the roadmap's own
 * "Mission Zip is NOT the same artifact as the existing mission export"): that one is a
 * mid/post-mission *backup* and always carries field reports; this one is a *template* taken
 * before a mission has any, so it never does. Two schemas, sharing only the ranger/mission
 * types themselves - not sharing one schema with a nullable `fieldReports` field, which would
 * make "is this a backup or a template?" a runtime guess instead of the file's own shape.
 *
 * v1 scope, per the roadmap's D-a deferral note: rangers + photos + settings only. Teams and
 * Facilities are not yet a real entity (D-a, still gated on real-world input) - this format
 * gets a `schemaVersion` specifically so a v2 payload (once Teams/Facilities exist) can be
 * told apart from a v1 one on read, the same discipline `MISSION_EXPORT_SCHEMA_VERSION`
 * already established for `MissionExport`.
 *
 * Photo matching reuses `RangerPhotoService`'s own filename-stem convention (a ranger's `id`
 * if set, else `callsign`, uppercased) - not reinvented here. "A wrong photo is worse than no
 * photo" (roster-build's own stated rule) - this module never guesses a match; it just
 * carries whatever `RangerPhotoService.allPhotoBlobs()` already resolved on write, and hands
 * raw filename/bytes pairs back on read for `RangerPhotoService.importFiles()`'s own matching
 * to run again against the (possibly different) roster being loaded into.
 */

export const MISSION_ZIP_SCHEMA_VERSION = 1

export type MissionZipManifest = {
  schemaVersion: number
  exportedAt: string
  appVersion: string
  settings: MissionType
  rangers: RangerType[]
}

export type MissionZipPhoto = { filename: string; bytes: Uint8Array }

const MANIFEST_ENTRY = 'mission-zip.json'
const PHOTOS_DIR = 'photos'

/** Basename match, not exact-path - same tolerance `importRosterBundle()` (rangers.component.ts) already needs for a hand-made Windows zip that may or may not wrap its contents in a folder. */
const basename = (path: string) => path.split(/[/\\]/).pop() || path

/**
 * Builds the zip's bytes. `photos` is whatever the caller already resolved (typically
 * `RangerPhotoService.allPhotoBlobs()`) - this function only packs it, it does not decide
 * which photos exist or match anyone.
 */
export async function buildMissionZipBytes(
  manifest: MissionZipManifest,
  photos: readonly { stem: string; blob: Blob }[],
): Promise<Uint8Array> {
  const files: Zippable = {
    [MANIFEST_ENTRY]: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  }

  for (const { stem, blob } of photos) {
    files[`${PHOTOS_DIR}/${stem}${extensionFor(blob.type)}`] = new Uint8Array(await blob.arrayBuffer())
  }

  return zipSync(files, { level: 6 })
}

/**
 * Reverses `buildMissionZipBytes()`. Throws with a message meant to be shown to a user (same
 * convention `RangerService.parseRosterJson()` follows) rather than a bare parser error.
 * Does not validate `settings`/`rangers` beyond "present and roughly the right shape" - the
 * caller is expected to run them through the same migration functions
 * `BackupService.importMission()` already uses (`migrateMission`/`normalizeRangerIds`) before
 * trusting them, since a Mission Zip built by an older app version needs exactly the same
 * upgrade path a Mission Export does.
 */
export function extractMissionZip(bytes: Uint8Array): { manifest: MissionZipManifest; photos: MissionZipPhoto[] } {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch (error: any) {
    throw new Error(`Could not read this file as a zip (${error.message}).`)
  }

  const manifestKey = Object.keys(entries).find(k => basename(k) === MANIFEST_ENTRY)
  if (!manifestKey) {
    throw new Error(`This zip does not contain a "${MANIFEST_ENTRY}" - it is not a Mission Zip.`)
  }

  let manifest: MissionZipManifest
  try {
    manifest = JSON.parse(new TextDecoder().decode(entries[manifestKey]))
  } catch (error: any) {
    throw new Error(`"${MANIFEST_ENTRY}" in this zip is not valid JSON (${error.message}).`)
  }

  if (!manifest || typeof manifest !== 'object' || !manifest.settings || !Array.isArray(manifest.rangers)) {
    throw new Error(`"${MANIFEST_ENTRY}" in this zip is not a valid Mission Zip manifest.`)
  }

  const photos: MissionZipPhoto[] = Object.keys(entries)
    .filter(k => !/[/\\]$/.test(k) && /\.(jpe?g|png|gif|webp)$/i.test(basename(k)))
    .map(k => ({ filename: basename(k), bytes: entries[k] }))

  return { manifest, photos }
}

function extensionFor(mimeType: string): string {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'image/gif') return '.gif'
  return '.jpg'
}
