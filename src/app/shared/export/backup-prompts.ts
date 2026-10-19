import type { BackupService } from '../services/backup.service'
import type { LogService } from '../services/log.service'

/**
 * The "Back up mission" questions and the backup itself, in one place so Mission > Data safety's
 * button and the Undo card's "Back up first" ask exactly the same things (PII warning, optional
 * passphrase typed twice). Resolves true once the backup file has been written, false when the
 * person cancelled or it failed (a failure is also shown to them).
 */
export async function promptAndBackUpMission(backup: BackupService, log: LogService, id: string): Promise<boolean> {
  // The backup bundles the full ranger roster, so it carries the same personal data as
  // the Rangers page warns about. E-122 Phase 1 made encrypting it optional, so this
  // offers the choice rather than only warning about the consequence.
  if (!confirm(`Back up this mission to a file?\n\n`
    + `The file includes the full ranger roster - legal names, personal `
    + `phone numbers and call signs.\n\n`
    + `You will be offered a passphrase next. Either way, store the file `
    + `appropriately, share it only with people who need it for this mission, and `
    + `delete it when the mission is over.`)) {
    log.verbose('promptAndBackUpMission: user cancelled backup.', id)
    return false
  }

  // Blank = unencrypted, which stays the default: a passphrase nobody can recover
  // destroys the mission record outright, and there is no server to reset it from.
  const passphrase = prompt(`Passphrase for this backup?\n\n`
    + `Leave blank for an UNENCRYPTED file (the previous behaviour).\n\n`
    + `If you set one it CANNOT be recovered - no reset, no support address, no `
    + `copy anywhere. Lose it and this backup is gone for good.`)

  if (passphrase === null) {
    log.verbose('promptAndBackUpMission: cancelled at the passphrase prompt.', id)
    return false
  }

  // Typed twice on purpose. A typo here is not discovered until the day someone needs
  // the backup, by which time it is unrecoverable - the worst failure this can produce.
  if (passphrase !== '') {
    if (prompt('Type the same passphrase again to confirm it.') !== passphrase) {
      alert('Those did not match. Nothing was written - start the backup again.')
      log.warn('promptAndBackUpMission: passphrase confirmation did not match.', id)
      return false
    }
  }

  log.verbose('promptAndBackUpMission: Backing up mission.', id)
  try {
    await backup.exportMission(passphrase || undefined)
    return true
  } catch (error: any) {
    log.error(`promptAndBackUpMission: backup failed: ${error.message}`, id)
    alert(`Could not write the backup: ${error.message}`)
    return false
  }
}
