/**
 * Map marker tooltips used to interpolate the raw `Date` object directly (`at ${i.date}`),
 * which rendered the browser's full `Date.toString()` - weekday, timezone name and all -
 * inside a small map tooltip. Short local time, to the minute, plus a relative "N min ago"
 * is what's actually useful there.
 */
export function formatReportTime(date: Date | string): string {
  const d = new Date(date)
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const minutesAgo = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000))
  return `${time} (${minutesAgo} min ago)`
}
