// Pre-Angular theme/skin applier and the Google Fonts async-load handoff, both extracted
// out of index.html's <head> on 2026-09-01 (E-44 CSP follow-up). Neither can move into the
// compiled app bundle: both must run before Angular (and its stylesheet) loads, and the
// bundle itself loads as a deferred <script type="module"> at the end of <body>, by which
// point first paint has already happened. This has to stay a classic, render-blocking
// <script src> in <head>, in the exact position index.html's own comment describes, so it
// still executes before the compiled stylesheet <link> the build injects at the end of
// <head> - a plain external file behaves identically to an inline block for that ordering;
// the browser still pauses parsing to fetch and run it before moving on.
//
// The one honest cost of moving this out of index.html: a truly first-ever visit (nothing
// cached anywhere yet) now pays one small same-origin network round trip before this runs,
// where the inline version paid none. From a second visit on, ngsw's own "assets" group
// (ngsw-config.json's `/assets/**`) has this cached, so it is no slower than inline was.
// Worth stating plainly given this app's own offline/field-first design goals - it was not
// free, just a trade accepted for CSP compliance (see below).
//
// WHY this became a separate file rather than staying inline: this app's Content-Security-
// Policy (src/_headers) is `script-src 'self'` with no 'unsafe-inline', no hash, no nonce -
// an inline <script> block violates that outright (browsers do log the exact SHA-256 hash
// that would silence it, but a hash breaks on the next whitespace-only edit to this file,
// which is a maintenance trap for code that gets touched over time). A same-origin file is
// already covered by 'self', needs no hash, and can be edited freely.

// Applies a saved light/dark override before Angular (and its stylesheet) loads, so a
// scribe who picked one doesn't see a flash of the OS-default scheme first. 'themeMode'
// must match THEME_MODE_KEY in src/app/shared/services/theme.service.ts, which owns this
// key from here on; 'auto' (or nothing stored) leaves color-scheme unset, so styles.scss's
// `light dark` default (follow the OS/browser) applies untouched.
try {
  var rtThemeMode = localStorage.getItem('themeMode');
  if (rtThemeMode === 'light' || rtThemeMode === 'dark') {
    document.documentElement.style.colorScheme = rtThemeMode;
  }
} catch (e) { /* localStorage unavailable (e.g. blocked in this context) - fall back to auto */ }

// Same reasoning as the block above, for the color-scheme ("skin") choice instead of
// light/dark. 'skinChoice' must match SKIN_KEY in src/app/shared/services/skin.service.ts.
// 'command' (or nothing stored) is the default and needs no attribute - styles.scss/
// _tokens.scss's own :root blocks already are command's values.
try {
  var rtSkin = localStorage.getItem('skinChoice');
  if (rtSkin === 'ridgeline' || rtSkin === 'nightwatch' || rtSkin === 'sagebrush' || rtSkin === 'signal') {
    document.documentElement.setAttribute('data-skin', rtSkin);
  }
} catch (e) { /* localStorage unavailable - fall back to command */ }

// The Google Fonts <link>'s async-load swap (index.html's own comment on that tag has the
// full Lighthouse/render-blocking reasoning). Previously the tag's own onload="this.media=
// 'all'" attribute - CSP blocks inline EVENT HANDLERS as script-src too, and unlike the
// block above, a hash can never cover this: hashes explicitly do not apply to event-handler
// attributes without 'unsafe-hashes' (browsers say so in the violation report itself), so
// moving the block above into a file wasn't enough on its own without also moving this.
// By the time this runs, the <link> node already exists in the DOM (the parser reached and
// created it before reaching this script, immediately above), even though its own stylesheet
// fetch may still be in flight - so attaching the listener here is not a race.
try {
  var rtFontsLink = document.getElementById('rt-google-fonts');
  if (rtFontsLink) {
    rtFontsLink.addEventListener('load', function () { rtFontsLink.media = 'all'; });
  }
} catch (e) { /* getElementById/addEventListener unavailable - fonts stay print-only, degrades to system font */ }
