/**
 * Builds the "Montecito" sample scenario (E-195) from the scenario tables kept outside the repo
 * (rangertrak-InternalDocs\E-195 Montecito\: msel.csv, places.csv, teams.csv) and writes it as
 * one TypeScript data module the app loads lazily:
 *
 *   node tools/regional/demo/make-montecito-demo.js [inputFolder] [outFile]
 *
 *   inputFolder  default: ..\rangertrak-InternalDocs\E-195 Montecito (a sibling of this repo's
 *                folder), or $MONTECITO_DIR
 *   outFile      default: src/app/shared/services/sample-data-montecito.ts
 *
 * The work is done by make-scenario-demo.js, shared with the Oso scenario (E-195, 2026-10-20);
 * this file is only Montecito's config. The generated output is unchanged by that split.
 */
const shared = require('./make-scenario-demo')

const CONFIG = {
  key: 'montecito', name: 'Montecito', script: 'make-montecito-demo.js', envVar: 'MONTECITO_DIR',
  event: 'Montecito debris flows (modeled)',
  eventNotes: 'Modeled on the January 9, 2018 debris flows in Montecito, California. The people, teams and '
    + 'messages are invented; the scale, phases and problems follow the public record.',
  seed: 195,
  centerPlace: 'P01', // Command Post 1
  eocPlace: 'P05', // County EOC: where Dispatch and Net Control traffic is logged
  areaCode: n => (n < 100 ? 805 : 626),
}

module.exports = {
  makeMontecito: tables => shared.makeScenario(tables, CONFIG),
  render: data => shared.render(data, CONFIG),
  readTables: shared.readTables,
  DEFAULT_IN: shared.inputDirFor(CONFIG),
  DEFAULT_OUT: shared.outFileFor(CONFIG),
  FATALITY_WORDS: shared.FATALITY_WORDS,
}
if (require.main === module) shared.runCli(CONFIG)
