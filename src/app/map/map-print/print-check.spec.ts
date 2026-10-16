import { armPrintCheck } from './print-check'

describe('armPrintCheck (temporary print diagnostic)', () => {
  let listener: (() => void) | undefined
  let matches = false
  let wide: HTMLDivElement

  beforeEach(() => {
    listener = undefined
    matches = false
    spyOn(window, 'matchMedia').and.returnValue({
      get matches() { return matches },
      addEventListener: (_: string, fn: () => void) => { listener = fn },
      removeEventListener: () => { listener = undefined },
    } as unknown as MediaQueryList)
    wide = document.createElement('div')
    wide.className = 'too-wide'
    wide.style.cssText = `position:absolute; left:0; top:0; width:${window.innerWidth + 300}px; height:5px`
    document.body.appendChild(wide)
  })

  afterEach(() => wide.remove())

  it('logs one line naming what is wider than the page, only once print layout is on', () => {
    const info = spyOn(console, 'info')
    const disarm = armPrintCheck('map')
    listener!()
    expect(info).not.toHaveBeenCalled() // screen media: nothing to report

    matches = true
    listener!()
    expect(info).toHaveBeenCalledTimes(1)
    const line = info.calls.mostRecent().args[0] as string
    expect(line.startsWith('RangerTrak print check: ')).toBeTrue()
    const data = JSON.parse(line.slice('RangerTrak print check: '.length))
    expect(data.kind).toBe('map')
    expect(data.wide.some((w: { el: string }) => w.el.includes('too-wide'))).toBeTrue()

    disarm()
    expect(listener).toBeUndefined()
  })
})
