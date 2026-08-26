/**
 * Every screen's on-page guidance, in one file.
 *
 * Before the Material-M3 pass (2026-08-25) this content was 15 `<rangertrak-section>`
 * blocks spread across 8 components - "Instructions", "Tips", "Advanced",
 * "Privacy & data handling", "Location Guidance", "Grid Menu Keyboard interaction" - each
 * sitting permanently in its page's main column, below the grid or form it described.
 * Nothing collapsed them (the 2026-08-25 de-collapse pass made them all always-visible),
 * so a scribe who had read them once still scrolled past them on every visit.
 *
 * They live here instead, behind one Guide button that sits in the same place in every
 * page header. Two things fall out of that which are worth the move on their own:
 *
 *   1. The relevance audit the roadmap has asked for twice (2026-08-22 and again
 *      2026-08-24 - "ensure all such verbiage still makes sense") is now a review of ONE
 *      file, not a hunt across eight components.
 *   2. Reference material stops competing with the thing the page is actually for. The
 *      redesign's page-order rule puts the primary object first; guidance was the main
 *      thing violating it.
 *
 * What deliberately did NOT move here: anything a scribe acts on rather than reads.
 * Export controls, row-count pickers, the map engine switch and every destructive button
 * stay grounded on their page - hiding a control behind a drawer is a different and worse
 * bargain than hiding an explanation.
 */

/** One heading plus its body. `text` renders as a paragraph, `bullets` as a list. */
export interface GuideBlock {
  heading: string
  text?: string
  bullets?: string[]
}

/** One tab in the drawer. */
export interface GuideTab {
  label: string
  blocks: GuideBlock[]
}

export interface GuideEntry {
  /** Shown as the drawer's subtitle, so a reader knows which screen they are reading about. */
  screen: string
  tabs: GuideTab[]
}

/**
 * Shared across the two AG Grid screens (Reports, Rangers). De-duplicated once already -
 * the two "Grid Menu Keyboard interaction" blocks were byte-identical and became
 * GridKeyboardHelpComponent on 2026-08-24; this is that same content, now with nowhere
 * left to be duplicated to.
 */
const GRID_KEYBOARD: GuideTab = {
  label: 'Keyboard',
  blocks: [
    {
      heading: 'Column and filter menus',
      bullets: [
        'Down arrow — move to the next menu item.',
        'Up arrow — move to the previous menu item.',
        'Right arrow — open a submenu.',
        'Left arrow or Escape — close the current menu.',
        'Enter — activate the focused item.',
        'Tab — leave the menu entirely.'
      ]
    },
    {
      heading: 'Moving around the grid',
      bullets: [
        'Arrow keys move the focused cell.',
        'Enter starts editing the focused cell; Escape cancels without saving.',
        'Tab moves to the next cell, wrapping to the next row at the end.'
      ]
    }
  ]
}

const YOUR_DATA: GuideTab = {
  label: 'Your data',
  blocks: [
    {
      heading: 'Where it lives',
      text: 'Everything RangerTrak knows is stored in this browser, on this device. There is no server, no account and no login, and nothing you type is sent anywhere.'
    },
    {
      heading: 'What that means',
      bullets: [
        'Another device — even another browser on this same machine — has its own separate copy.',
        'Clearing site data clears the mission. Mission Setup has an Export that guards against this.',
        'An exported file contains the ranger roster in the clear: legal names, phone numbers and call signs. It is not encrypted.'
      ]
    }
  ]
}

export const GUIDE_CONTENT: Record<string, GuideEntry> = {

  '/': {
    screen: 'Field Report Entry',
    tabs: [
      {
        label: 'This page',
        blocks: [
          {
            heading: 'The four questions',
            text: 'Who is reporting, where they are, when it happened, and what they said. Tab moves through them in radio-call order, so a whole report can be typed without touching the mouse.'
          },
          {
            heading: 'Positions',
            bullets: [
              'Type a position in whichever format it was read to you — the rest are derived and shown below the fields.',
              'Click the map to move the pin, which fills the coordinates in for you.',
              'Every format here assumes WGS84 / modern GPS. A position read off an older paper topo quad may use NAD27 instead, which can be 100–200 m off in the western US.'
            ]
          },
          {
            heading: 'Notes and 213 messages are not the same thing',
            text: 'Notes is the general record of this report — always saved, and what appears on the Reports grid and in the ICS-309 communications log. A 213 message is a separate, addressed message that only some reports generate, and is often reworded rather than copied from your notes.'
          }
        ]
      },
      YOUR_DATA
    ]
  },

  '/reports': {
    screen: 'Field Reports',
    tabs: [
      {
        label: 'This page',
        blocks: [
          {
            heading: 'Editing',
            bullets: [
              'Edits save automatically — there is no Save button on this page.',
              'Address and Lat are single-click to edit; other cells are double-click.',
              'Click a column heading to sort by it, or drag it to reorder the columns.',
              'Hovering a cell may show more than the column has room for.'
            ]
          },
          {
            heading: 'Exporting',
            bullets: [
              'Only the filtered and sorted rows are exported, unless you tick All rows.',
              'Comma-separated imports into Excel most cleanly.'
            ]
          },
          {
            heading: 'Selection and the maps',
            text: 'Rows selected here can be isolated on either map engine, using the switch on the Map page.'
          }
        ]
      },
      GRID_KEYBOARD,
      YOUR_DATA
    ]
  },

  '/rangers': {
    screen: 'Rangers & Teams',
    tabs: [
      {
        label: 'This page',
        blocks: [
          {
            heading: 'Edits here are NOT saved automatically',
            text: 'Unlike the Reports grid, changes typed into this grid need the Save edits button before they stick. Importing, adding and deleting a ranger all save themselves.'
          },
          {
            heading: 'Loading a roster',
            bullets: [
              'Import roster replaces the whole roster from a JSON file (or a zip holding roster.json and a photos/ folder) and leaves field reports and settings alone. Each entry needs at least a callsign.',
              'Export roster writes that file back out. Do it before importing if you want to keep the roster you already have.',
              'JSON round-trips: it can be imported back in. Export CSV is for Excel and cannot.',
              'Photos are kept on this device only, never uploaded and never in the repo. Name each file after the call sign.'
            ]
          },
          {
            heading: 'Starting from the built-in station list',
            text: 'Add station callsigns appends the 18 built-in Vashon station signs (command post, ACS, CERT and MERT teams) to whatever is already there. They are stations, not people — and it ADDS rather than replaces, so pressing it twice gives you duplicates. That is why it sits in the Danger zone.'
          },
          {
            heading: 'Emptying the roster',
            text: 'Delete all rangers empties it and it stays empty, including after a reload. (Before v0.15.3 the built-in station list came straight back, which made loading your own roster a fight.)'
          },
          {
            heading: 'Moving a whole mission',
            text: 'To move the roster, settings and field reports together, use Export/Import Mission on the Mission Setup page. Import/Export roster here moves only the roster.'
          },
          {
            heading: 'Tactical call signs',
            text: 'A responder without an amateur licence still needs to be pickable on Entry. Add them a tactical sign, or leave the call sign blank and RangerTrak will fall back to their name.'
          }
        ]
      },
      GRID_KEYBOARD,
      {
        label: 'Privacy',
        blocks: [
          {
            heading: 'This roster is confidential',
            text: 'It holds participant personal data — legal names, personal phone numbers, call signs — stored unencrypted in this browser and exported unencrypted.'
          },
          {
            heading: 'Handling it',
            bullets: [
              'Treat an exported roster the way you would a printed contact list: keep it on a device you control, and delete it when the mission is over.',
              'Nothing here is transmitted anywhere by RangerTrak itself.'
            ]
          }
        ]
      }
    ]
  },

  '/mission': {
    screen: 'Mission Setup',
    tabs: [
      {
        label: 'This page',
        blocks: [
          {
            heading: 'Starting a new incident',
            bullets: [
              'Set the mission name and operational period — both feed the header and every printed ICS form.',
              'Load or update the roster on the Rangers page.',
              'Clear out the previous exercise’s field reports from the Reports page.',
              'Or reset everything at once from the Danger zone at the bottom of this page.'
            ]
          },
          {
            heading: 'Location defaults',
            text: 'These seed the Entry form’s starting position only. Maps ignore them — a map auto-centres on the centroid of the reports actually entered, then zooms to fit them all.'
          },
          {
            heading: 'Readiness',
            text: 'The coloured dot in the page header tracks six setup checks. When it is not green, this page lists exactly which ones are failing and links to the field that fixes each.'
          }
        ]
      },
      YOUR_DATA
    ]
  },

  '/map': {
    screen: 'Map',
    tabs: [
      {
        label: 'This page',
        blocks: [
          {
            heading: 'What is shown',
            bullets: [
              'All field reports for all rangers, by default.',
              'If rows are selected on the Reports page, the switch below the map isolates just those.',
              'Nearby reports group into clusters — click a cluster to zoom in.',
              'Each ranger has their own marker shape and colour, consistent everywhere.'
            ]
          },
          {
            heading: 'Working offline',
            text: 'Leaflet caches the tiles you have already viewed, and can bulk-save an area ahead of time. The MapLibre + PMTiles engine carries its own bundled tiles for the pilot region and needs no network at all.'
          }
        ]
      },
      YOUR_DATA
    ]
  }
}

/**
 * Resolves a router URL to its guide entry. Query strings and fragments are stripped, and
 * an unknown route returns undefined - the Guide button hides itself rather than opening
 * an empty drawer.
 */
export function guideFor(url: string): GuideEntry | undefined {
  const path = url.split('?')[0].split('#')[0]
  return GUIDE_CONTENT[path] ?? GUIDE_CONTENT[path.replace(/\/$/, '')]
}
