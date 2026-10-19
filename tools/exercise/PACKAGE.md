# Scenario package format (E-196 phase 0)

A scenario is a **folder** (later a zip) the console opens. The console has no built-in scenarios.
One sample ships in `samples/montecito/`. All people, teams and messages in a package are made
up; never put real rosters or anything from the regional-data folder in one.

```
my-scenario/
  scenario.json     about the scenario and its default settings
  msel.csv          the timed script (master scenario events list)
  places.csv        places the script refers to
  teams.csv         the teams that appear in the script
  media/            optional local copies of pictures or video named by media rows
```

## scenario.json

| Key | Required | Meaning |
|---|---|---|
| `format` | no | 1 |
| `title` | yes | Shown in the console and in file names. |
| `about` | yes | The honest one-line description (people and messages invented; scale and problems follow the record). |
| `modeledOn` | yes | The "modeled on ..." line. |
| `contentNote` | **yes if any row has `kind` = `casualty`** | Shown before the class starts and reprinted on the controller packet. |
| `sources` | no | `[{ "id", "title", "url" }]`, cited by `source_ref` in the MSEL. |
| `startTime` | yes | `YYYY-MM-DDTHH:MM`, local wall clock, no zone. |
| `opPeriods` | no | `[{ "n": 0, "label": "...", "start": "YYYY-MM-DDTHH:MM" }]`. When absent, an op period starts at its first row. |
| `defaults` | no | Default class settings: `pace`, `intensity`, `casualtyRealism`, `revealReal`, `playedTeams`. |

## msel.csv

Exactly these columns, in this order. Standard CSV: quote any cell that has a comma, a quote or a
line break; double a quote inside a quoted cell.

`id,scenario_time,op_period,from,to,channel,message,place_id,kind,delivery,decision_point,what_really_happened,source_ref,casualty_recorded,casualty_softened,test,teaching_note,photo,license`

| Column | Meaning |
|---|---|
| `id` | Unique, no spaces (`M0001`). Thinning and per-row settings are keyed on it. |
| `scenario_time` | `YYYY-MM-DDTHH:MM`, local, no zone. Rows must be in time order inside each op period. |
| `op_period` | Whole number. |
| `from`, `to` | Tactical calls. Names that are not in teams.csv (a room display, "All units") are allowed and listed as a warning. |
| `channel` | `Tac 1`, `Phone`, `Display`, ... Free text. `Phone` becomes the Phone source in the log. |
| `message` | The exact words. For `casualty` rows this holds the softened wording. For `media` rows it is the caption. |
| `place_id` | Optional; must exist in places.csv. |
| `kind` | `status`, `resource`, `traffic`, `hazard`, `find`, `casualty`, `media`, `test`. |
| `delivery` | `background` (already happened; written into the log by a catch-up file) or `inject` (said to the players; a cue card). |
| `decision_point` | If filled, the console pauses here and shows this discussion text. |
| `what_really_happened` | Revealed after the discussion, only when the class setting allows it. |
| `source_ref` | Source ids (`S01;S04`), `invented`, or for media rows the URL. |
| `casualty_recorded`, `casualty_softened` | The two versions of a `casualty` row. The class setting picks which replaces `message`. |
| `test` | A planted trap: `pii`, `wrong-grid`, `unverified-rumor`, `duplicate-report`, `media-call`, `self-deploy`. |
| `teaching_note` | For an inject, the expected player action; for a test, the correct response. Hidden until the instructor clicks. For a `pii` test, `search the log for 'a', 'b' and 'c'` lists the bait the debrief searches for. |
| `photo` | A description, or a file in `media/`. |
| `license` | The licence of a media item. Fill it on every media row. |

### How the console treats a row

1. **Background**: `delivery` = `background`. Written to the catch-up file, rebased to now. These are
   the rows thinning can drop (25, 50 or 100 percent, chosen by a stable hash of the id).
2. **Inject**: `delivery` = `inject`. Becomes a cue card; never thinned.
3. **Played**: a row whose `from` is a team the trainees play. Becomes a cue card telling the trainee
   what to send; never written to a catch-up file.
4. **Media**: `kind` = `media`. Goes to the room display at its time.
5. **Decision points, tests and casualty rows** are never dropped.

## places.csv

`id,label,type,lat,lon` (extra columns, such as `note`, are allowed). Real geography, generic labels.

## teams.csv

`id,tactical_call` (extra columns allowed, such as `type`, `agency_type`, `members`).

## What the Report Packet catch-up file looks like

See `README.md` ("What the catch-up file contains"). It is the app's own Report Packet, plain JSON
saved as `.txt`, with EXERCISE in the file name, the mission name and every entry's note.
