// `address` (home address) was removed 2026-08-26 (maintainer): confirmed by grepping every
// consumer that it was never read by any feature - only ever displayed/edited/exported as a
// plain grid column, unlike phone/rew/image which the Entry autocomplete and map markers
// actually use. Genuine PII with zero functional payoff. See ADR/roadmap for the fuller
// reasoning, including why this doesn't meaningfully change the roster's overall exposure
// (a callsign already resolves to more via the FCC's own public ULS lookup) except for
// photographs, which aren't part of any public record.
export interface RangerType {
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
