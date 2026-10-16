// Split out of guide-content.ts so the eager Guide drawer does not pull the whole Guide text
// into the initial bundle (E-192). The text itself is loaded when the Guide first opens.

/**
 * Renders a `text`/bullet string for display, turning any `[label](https://...)` markers
 * into a real external link. Everything else is HTML-escaped first, so this is safe to bind
 * via `[innerHTML]` even though the source is a plain string, not markdown - the guide has no
 * other use for HTML markup, and this content is developer-authored, never user input.
 */
export function renderGuideText(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(
    /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
    (_match, label: string, href: string) =>
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
  )
}
