/**
 * ADR D-49 (2026-08-30): the first of the People/Teams/Facilities split (D-45) to actually
 * ship - renamed from "Facilities" to "Locations" per the maintainer's own live wording.
 * Teams is still deferred; this covers named, fixed points on the map for a mission -
 * Command Post, Staging Area, Ranger First Aid, and whatever else a mission needs, none of
 * which are rangers and none of which are field reports.
 *
 * Scoped PER-MISSION, same as RangerType - there is no operational-period partitioning
 * anywhere in this app today (opPeriod/opPeriodStart/opPeriodEnd are plain display fields on
 * MissionType, nothing scopes data by them), so this does not invent one either. See the
 * live design discussion recorded in `Architectural Decision Record.md`'s D-49 for why.
 */

/**
 * A mission-configured category of location - Command Post, Staging Area, Ranger First Aid,
 * Other, etc. Mirrors FieldReportStatusType's shape (a name plus a colour, mission-editable),
 * minus `icon`: locations are drawn as one shape family on the map (locationIconFor()),
 * distinguished from each other by colour and label, not by a per-category image asset.
 */
export type LocationCategoryType = {
  type: string,
  color: string,
}

/**
 * One named, located point on the mission - a Command Post, a Staging Area, an aid station.
 *
 * `uid` mirrors RangerType's surrogate-key pattern (ADR D-42/D-43): app-minted, never shown,
 * never edited, guaranteed present after migration. Nothing joins reports to a location yet
 * (that is a later pass, not this one), but the key exists now so that join is additive
 * later rather than a breaking change to this shape.
 *
 * `type` stores the category NAME (a string), resolved against the mission's own
 * `locationTypes` list for its colour - same indirection FieldReportType.status uses against
 * fieldReportStatuses, not a second enum to keep in sync.
 */
export type MissionLocationType = {
  uid?: string,
  name: string,
  type: string,
  lat: number,
  lng: number,
  address?: string,
  note?: string,
}
