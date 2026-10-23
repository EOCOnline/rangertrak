/**
 * E-220 / ADR D-68: the message number. Mission, op period, station letter and a sequence, stamped
 * once on the entry when it first enters a log and never changed. `uid` stays the identity (D-59);
 * this is the number people read, say over the radio and write on paper.
 *
 * Pure (D-57): no injection, no storage.
 */
export interface MsgNo { mission: string; opPeriod: string; station: string; seq: number }

/** E-218: the printed and on-screen status mark. A fixed set, no user-defined list. */
export type HandledMark = 'handled' | 'passed' | 'action'   // ✓  →  !
export const HANDLED_MARKS: readonly HandledMark[] = ['handled', 'passed', 'action']
export const HANDLED_MARK_GLYPH: Record<HandledMark, string> = { handled: '✓', passed: '→', action: '!' }
export const HANDLED_MARK_LABEL: Record<HandledMark, string> = { handled: 'Handled', passed: 'Passed on', action: 'Needs action' }

/** The next mark in the click cycle: blank, then ✓, →, ! and back to blank. */
export function nextHandledMark(current: HandledMark | undefined): HandledMark | undefined {
  if (!current) return HANDLED_MARKS[0]
  return HANDLED_MARKS[HANDLED_MARKS.indexOf(current) + 1]
}

/** What the high-water mark is keyed by: the sequence counts per op period and station. */
export function msgNoHighWaterKey(opPeriod: string, station: string): string {
  return opPeriod + '\u0000' + station
}

export interface MsgNoContext { mission: string; opPeriod: string; station: string }

/**
 * Next = 1 + the larger of the stored high-water mark and the highest `seq` among entries with the
 * same op period and station. The high-water mark is what stops a deleted last entry's number being
 * reused; `bumpHighWater` records the number just handed out.
 */
export function nextMsgNo(
  entries: readonly { msgNo?: MsgNo }[],
  highWater: Readonly<Record<string, number>> | undefined,
  ctx: MsgNoContext,
): MsgNo {
  let max = highWater?.[msgNoHighWaterKey(ctx.opPeriod, ctx.station)] ?? 0
  for (const e of entries) {
    const n = e.msgNo
    if (n && n.opPeriod === ctx.opPeriod && n.station === ctx.station && n.seq > max) max = n.seq
  }
  return { mission: ctx.mission, opPeriod: ctx.opPeriod, station: ctx.station, seq: max + 1 }
}

/** A new high-water map that covers `n`. Never lowers a mark. */
export function bumpHighWater(highWater: Readonly<Record<string, number>> | undefined, n: MsgNo): Record<string, number> {
  const key = msgNoHighWaterKey(n.opPeriod, n.station)
  const current = highWater?.[key] ?? 0
  return { ...highWater, [key]: Math.max(current, n.seq) }
}

/** 'A007'. The sequence pads to three digits and grows past 999 ('A1000'). */
export function formatMsgNoShort(n: MsgNo | undefined): string {
  return n ? `${n.station}${String(n.seq).padStart(3, '0')}` : ''
}

/** '26-0142 / OP 2 / A007'. A blank mission or op period drops that part and its ' / '. */
export function formatMsgNoFull(n: MsgNo | undefined): string {
  if (!n) return ''
  return [n.mission?.trim(), n.opPeriod?.trim(), formatMsgNoShort(n)].filter(Boolean).join(' / ')
}

/** "Mission 26-0142 · Op period OP 2" for above a printed table; blank parts are left out. */
export function formatMsgNoContextLine(mission: string | undefined, opPeriod: string | undefined): string {
  return [
    mission?.trim() ? `Mission ${mission.trim()}` : '',
    opPeriod?.trim() ? `Op period ${opPeriod.trim()}` : '',
  ].filter(Boolean).join(' · ')
}

/** Entries that carry the same full number but are not the same entry (different uid). */
export function findMsgNoClashes(
  local: readonly { uid?: string; msgNo?: MsgNo }[],
  incoming: readonly { uid?: string; msgNo?: MsgNo }[],
): Array<{ msgNo: string; uids: [string, string] }> {
  const byNumber = new Map<string, string>()
  for (const e of local) {
    if (e.msgNo && e.uid) byNumber.set(formatMsgNoFull(e.msgNo), e.uid)
  }
  const out: Array<{ msgNo: string; uids: [string, string] }> = []
  for (const e of incoming) {
    if (!e.msgNo || !e.uid) continue
    const key = formatMsgNoFull(e.msgNo)
    const mine = byNumber.get(key)
    if (mine && mine !== e.uid) out.push({ msgNo: key, uids: [mine, e.uid] })
  }
  return out
}

/** The CSV columns E-220 / E-218 add to the radio log export, in order. */
export const MSG_NO_CSV_COLUMNS = ['msg_mission', 'msg_op_period', 'msg_station', 'msg_seq', 'msg_no', 'handled'] as const
export type MsgNoCsvColumn = typeof MSG_NO_CSV_COLUMNS[number]

/** One entry's values for those columns; `msg_no` is the full form, `handled` the mark's words. All blank for none. */
export function msgNoCsvFields(
  entry: { msgNo?: MsgNo; handled?: { mark: HandledMark } },
): Record<MsgNoCsvColumn, string | number> {
  const n = entry.msgNo
  return {
    msg_mission: n?.mission ?? '',
    msg_op_period: n?.opPeriod ?? '',
    msg_station: n?.station ?? '',
    msg_seq: n?.seq ?? '',
    msg_no: formatMsgNoFull(n),
    handled: entry.handled ? HANDLED_MARK_LABEL[entry.handled.mark] ?? '' : '',
  }
}

/**
 * The one plain line a merge summary and Mission's letter field show for clashes. Empty for none.
 * Clash numbers are full-form; the line names the short form (A007).
 */
export function msgNoClashSentence(clashes: ReadonlyArray<{ msgNo: string }>): string {
  if (!clashes.length) return ''
  const shorts = [...new Set(clashes.map(c => c.msgNo.split(' / ').pop() ?? c.msgNo))]
  const what = shorts.length === 1 ? `Two messages are both numbered ${shorts[0]}.` : `Some messages share a number (${shorts.join(', ')}).`
  return `${what} Check that each device logs as its own station letter.`
}

/** The station letters on numbered entries, most used first (ties alphabetical). */
export function stationsByUse(entries: ReadonlyArray<{ msgNo?: MsgNo }>): string[] {
  const counts = new Map<string, number>()
  for (const e of entries) if (e.msgNo?.station) counts.set(e.msgNo.station, (counts.get(e.msgNo.station) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([letter]) => letter)
}

/** The first letter after the highest one seen that is not itself seen; wraps past Z, '' only if all 26 are taken. */
export function nextFreeStation(seen: Iterable<string>): string {
  const taken = new Set([...seen].map(s => s.toUpperCase()))
  const highest = [...taken].sort().pop()
  const start = highest ? highest.charCodeAt(0) - 64 : 0   // 'A' is 1; 0 starts at A
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + ((start + i) % 26))
    if (!taken.has(letter)) return letter
  }
  return ''
}

/**
 * Numbers every entry that has no `msgNo`, oldest first, as `station` with the op period `opPeriodOf` names for it.
 * Used by the schema 2 -> 3 migration and by the demo scenarios, which build whole logs at once. Entries that
 * already have a number keep it. Returns new entries in the ORIGINAL order, and the high-water map.
 */
export function numberEntries<T extends { date: Date | string; msgNo?: MsgNo }>(
  entries: readonly T[],
  opts: { mission: string; station: string; opPeriodOf: (entry: T) => string; highWater?: Record<string, number> },
): { entries: T[]; highWater: Record<string, number> } {
  let highWater: Record<string, number> = { ...opts.highWater }
  const byTime = entries
    .map((entry, index) => ({ entry, index, time: new Date(entry.date).getTime() }))
    .sort((a, b) => (Number.isFinite(a.time) && Number.isFinite(b.time) ? a.time - b.time : 0) || a.index - b.index)
  const out = [...entries]
  const stamped: { msgNo?: MsgNo }[] = entries.filter(e => e.msgNo)
  for (const { entry, index } of byTime) {
    if (entry.msgNo) continue
    const msgNo = nextMsgNo(stamped, highWater, { mission: opts.mission, opPeriod: opts.opPeriodOf(entry), station: opts.station })
    highWater = bumpHighWater(highWater, msgNo)
    out[index] = { ...entry, msgNo }
    stamped.push({ msgNo })
  }
  return { entries: out, highWater }
}
