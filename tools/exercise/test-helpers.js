// SPDX-License-Identifier: AGPL-3.0-or-later
import { MSEL_COLUMNS } from './lib/package.js'
import { toCsv } from './lib/csv.js'

export const row = (o = {}) => ({
  id: 'R1', scenario_time: '2030-01-01T08:00', op_period: '0', from: 'A', to: 'B', channel: 'Tac 1', message: 'hello',
  place_id: 'P1', kind: 'status', delivery: 'background', ...o,
})
export const makeTexts = (rows, extra = {}) => ({
  scenario: JSON.stringify({ title: 'T', about: 'a', modeledOn: 'm', startTime: '2030-01-01T08:00', contentNote: 'c', ...extra.scenario }),
  msel: toCsv(MSEL_COLUMNS, rows),
  places: 'id,label,type,lat,lon\nP1,Place 1,site,47.4,-122.4\n',
  teams: 'id,tactical_call\nT1,A\nT2,B\n',
})
