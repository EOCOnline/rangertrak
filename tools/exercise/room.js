// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.
//
// The room display: a second window the instructor drags onto the projector. It only listens.
// Messages from console.js over a BroadcastChannel (same browser, same origin, no network):
//   { type: 'clock', clock: 'HH:MM', date, opLabel, ops: [{ label, state: 'past'|'now'|'next' }] }
//   { type: 'media', item: { caption, source, license, scenarioTime, url, mediaType: 'image'|'video'|'card' } }
//   { type: 'clear' }          back to the waiting message
//   { type: 'blank', on }      blank or unblank
// It sends { type: 'hello' } when it opens so the console can send the current state again.

export const CHANNEL_NAME = 'rangertrak-exercise-room'

const $ = id => document.getElementById(id)
const stage = $('stage')
const channel = new BroadcastChannel(CHANNEL_NAME)

function text(tag, cls, value) {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  el.textContent = value
  return el
}

function metaLine(item) {
  const m = text('div', 'meta', '')
  const parts = []
  if (item.scenarioTime) parts.push(['Scenario time ', item.scenarioTime])
  if (item.source) parts.push(['Source ', item.source])
  if (item.license) parts.push(['Licence ', item.license])
  parts.forEach(([label, value], i) => {
    if (i) m.append('   |   ')
    m.append(label)
    m.append(Object.assign(document.createElement('b'), { textContent: value }))
  })
  return m
}

function showCard(item, note) {
  const card = text('div', 'card', '')
  card.append(text('div', 'caption', item.caption || ''))
  if (note) card.append(text('div', 'meta', note))
  card.append(metaLine(item))
  stage.replaceChildren(card)
}

function showMedia(item) {
  stage.classList.add('fading')
  setTimeout(() => {
    if (item.mediaType === 'image' && item.url) {
      const img = document.createElement('img')
      img.alt = item.caption || ''
      // A link-only picture that cannot load (offline) becomes a caption card.
      img.onerror = () => showCard(item, 'Picture not available offline: link only.')
      img.src = item.url
      stage.replaceChildren(img, text('div', 'caption', item.caption || ''), metaLine(item))
    } else if (item.mediaType === 'video' && item.url) {
      const v = document.createElement('video')
      v.controls = true; v.autoplay = true
      v.onerror = () => showCard(item, 'Video not available offline: link only.')
      v.src = item.url
      stage.replaceChildren(v, text('div', 'caption', item.caption || ''), metaLine(item))
    } else {
      showCard(item, item.url ? '' : 'Link only. The instructor holds the original.')
    }
    stage.classList.remove('fading')
  }, 350)
}

channel.onmessage = ev => {
  const m = ev.data || {}
  if (m.type === 'clock') {
    $('clock').textContent = m.clock + (m.date ? '  ' + m.date : '')
    $('ops').replaceChildren(...(m.ops || []).map(o => { const s = text('span', o.state, o.label); return s }))
  } else if (m.type === 'media') showMedia(m.item)
  else if (m.type === 'clear') stage.replaceChildren(text('div', 'waiting', 'Waiting for the next item'))
  else if (m.type === 'blank') $('blank').classList.toggle('on', !!m.on)
}

addEventListener('keydown', e => {
  if (e.key === 'b' || e.key === 'B') $('blank').classList.toggle('on')
  if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.().catch(() => {})
})

channel.postMessage({ type: 'hello' })
