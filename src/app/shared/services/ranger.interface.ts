// `address` (home address) was removed 2026-08-26 (maintainer): confirmed by grepping every
// consumer that it was never read by any feature - only ever displayed/edited/exported as a
// plain grid column, unlike phone/rew/image which the Entry autocomplete and map markers
// actually use. Genuine PII with zero functional payoff. See ADR/roadmap for the fuller
// reasoning, including why this doesn't meaningfully change the roster's overall exposure
// (a callsign already resolves to more via the FCC's own public ULS lookup) except for
// photographs, which aren't part of any public record.
export interface RangerType {
  // ADR D-42, Phase 1: the generic, unique identifier that is replacing `callsign` as the
  // ranger/report join key, because not every ranger has a callsign (CERT/MERT responders
  // often don't). Format `<PREFIX>-<digits>` - `VI-0038`/`REW-0038` from a real credential,
  // `TEW-1003` synthesized where there was none. Populated by `ranger-migration.ts`.
  //
  // OPTIONAL during the migration, deliberately - the same additive approach E-41's fields
  // and `evidenceLocation` used, so a returning user's stored roster (which has no `id`) is
  // simply backfilled on load rather than failing to parse. Tighten to required once every
  // write path populates it; see the phased plan in `D-42 Callsign to ID Migration.md`.
  id?: string
  callsign: string
  fullName: string
  phone: string
  image: string
  rew: string   // WA's Registered Emergency Worker number
  team: string
  role: string
  note: string
}

export const UnknownRanger: RangerType = {
  callsign: "Unknown",
  fullName: "Unknown Ranger",
  phone: "",
  image: "",
  rew: "",   // WA's Registered Emergency Worker number
  team: "",
  role: "",
  note: "Unknown Ranger entered. Go to Rangers page & enter new folks there!",
}
