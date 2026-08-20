# 🌲 RangerTrak™ 📡

[![SWUbanner](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner2-direct.svg)](https://vshymanskyy.github.io/StandWithUkraine)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**RangerTrak tracks and maps CERT, ACS, SAR, wildland-fire and other teams who are
reachable only by HAM radio.** Field teams radio in their locations; a scribe at the
command post transcribes them; RangerTrak builds a single mapped log of who was where,
when, and in what condition — for live situational awareness and after-action
documentation.

It is a [Progressive Web App](https://en.wikipedia.org/wiki/Progressive_web_app) that runs
entirely in the browser. **No server, no account, no API key, and no Internet required**
once it has been loaded — which is the point, because the command post often has none.

Because reading latitude and longitude over a radio is slow and error-prone, locations can
also be reported as street addresses or Plus Codes.

**Try it: <https://RangerTrak.org>**

---

## 📚 Documentation

| Document | For | Contents |
| --- | --- | --- |
| **[FIELD-GUIDE.md](FIELD-GUIDE.md)** | Operators, ECs, scribes | What each screen does, and how to prepare a device so it works when the network doesn't |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Developers | How the app is built: map engines, geocoding, bundle and loading strategy |
| **[DEVELOPING.md](DEVELOPING.md)** | Developers | Running, testing, releasing, updating dependencies, deploying |
| **[contributing.md](contributing.md)** | Everyone | Code of conduct |
| **[CHANGELOG.md](CHANGELOG.md)** | Everyone | Release history |
| **[.vscode/SETUP.md](.vscode/SETUP.md)** | Developers | VS Code workspace setup |

**New to RangerTrak? Start with the [Field Guide](FIELD-GUIDE.md).** In particular, read
"Before the mission" — the difference between a prepared device and an unprepared one is
the difference between a working tool and a blank screen.

---

## ✨ What it does

- **Works offline.** Entering reports, the roster, the report table, coordinate
  conversion, and mission export/import are all local to your device.
- **Six coordinate formats**, entered however the field team read them out: Decimal
  Degrees, Degrees/Decimal Minutes, Degrees-Minutes-Seconds, MGRS, UTM, and Maidenhead grid
  locators — plus Plus Codes and street addresses. All lat/long and grid conversion is
  computed on-device, so it keeps working with no connection.
- **Two map engines.** A Leaflet map over standard online road maps, and an offline map
  (MapLibre + PMTiles) whose basemap data ships inside the app. Both cluster markers and
  have overview maps.
- **Roster with call-sign lookup.** Fast entry by tactical call sign, for individuals or
  teams.
- **Editable statuses** with custom names and colours, plus searchable free-text notes.
- **Mission and operational period tracking.**
- **Export and import.** Reports and roster export to CSV/Excel; a whole mission
  (settings, roster, reports) exports to a single file for backup or handover.
- **Sample data** for demonstrations and training, loadable in one click.
- **Free and open source**, under the AGPL — free to use, free to modify.

> ⚠️ The roster contains personal information — names, addresses, phone numbers, and call
> signs that map to public licence records — stored unencrypted on the device. See the
> Field Guide for handling guidance.

## 🗺️ Roadmap

Current work is tracked in
[milestones](https://github.com/EOCOnline/rangertrak/milestones) and the
[issues page](https://github.com/EOCOnline/rangertrak/issues) — comments and feature
suggestions are welcome on either. A consolidated public `ROADMAP.md` will follow once the
next release's scope is firm.

Known gaps worth stating plainly: teams that have **not** reported in are not yet flagged
automatically, the offline map's detailed coverage is currently limited to a pilot region,
and What3Words support is shelved pending an SDK migration.

## 🚀 Quick start

**Using it:** visit <https://RangerTrak.org>, then set up the mission in **Settings**, add
people on the **Rangers** page, and enter reports on the **Home** screen. Full walkthrough
in the [Field Guide](FIELD-GUIDE.md).

**Developing it:**

```bash
git clone https://github.com/YOUR_USERNAME/rangertrak.git
cd rangertrak
npm install
npm start
```

Details, testing and release process in [DEVELOPING.md](DEVELOPING.md).

## 🌐 eoc.online

<https://eoc.online> provides free tools for Emergency Operations Centers and local
CERT/VOAD/Citizen Corps groups. We'd love to hear how you use RangerTrak and what you need
from it.

## 🗣️ Feedback & contribution

- **[GitHub issues](https://github.com/EOCOnline/rangertrak/issues)** — bugs and specific
  pieces of work.
- **GitHub discussions** — open-ended conversation about the project.
- **Pull requests** — including small edits made entirely in GitHub's browser editor; no
  local setup needed for a documentation fix.
- **Email** — <RangerTeam@eoc.online>.

## 📜 License

Copyright © 2019–2026 eoc.online

RangerTrak is free software: you can redistribute it and/or modify it under the terms of
the **GNU Affero General Public License** as published by the Free Software Foundation,
either version 3 of the License, or (at your option) any later version. See
[LICENSE](LICENSE) for the full text.

- **Using RangerTrak — including at your EOC, exercise, or incident — is completely free
  and always will be.** The AGPL places no obligations at all on people who simply *use*
  the application.
- If you **modify** RangerTrak and distribute it, or run your modified version as a network
  service, you must make your modified source available under the same license.
- Contributions are welcome. Note that the project may offer commercially licensed versions
  in future, so contributors may be asked to sign a Contributor License Agreement.

*(Releases prior to this change were published under the MIT License and remain available
under those terms.)*

## 💬 Testimonials

> "*(We) all agreed that this is a WOW program with high value added to SAR. I really hope
> you continue to refine it!*"

— Michael Meyer, KB7MTM, [Vashon ACS](https://vashonbeprepared.org/en-us/Partners/ACS)
