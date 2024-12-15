
import { Subscription } from 'rxjs'

import { Component, Inject, isDevMode, OnDestroy, OnInit, ViewChild } from '@angular/core'

import { ClockService, LogService, SettingsService, SettingsType } from '../../shared/services'
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

@Component({
    selector: 'rangertrak-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    providers: [SettingsService],
    standalone: false
})
export class AboutComponent implements OnDestroy, OnInit {

  id = 'About'
  private settingsSubscription!: Subscription
  private settings!: SettingsType
  public version = ''
  today = new Date()

  // Makes spans (elements) for each letter/word
  animatedSpan = (text: string, index: number) => {
    const node = document.createElement('span')
    node.textContent = text

    // Set custom property "--index" with the array position
    node.style.setProperty('--index', index.toString())

    return node
  }

  constructor(
    private log: LogService,
    private settingsService: SettingsService
  ) {
    console.log("AboutComponent  ======== Constructor() ============ ")

    // https://angular.io/tutorial/toh-pt4#call-it-in-ngoninit states subscribes should happen in OnInit()
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.version = this.settings ? this.settings.version : '0'
  }

  ngOnInit() {
    // console.error("lets get animated!")
    // this.animatedLetters()
    // console.error("we got animated!")
  }

  // from https://web.dev/patterns/animation/
  animatedLetters() {
    // Don't display if user gets 'motion-sickness'
    const { matches: motionOK } = window.matchMedia(
      '(prefers-reduced-motion: no-preference)'
    )

    //if (motionOK) {
    const splitTargets = document.querySelectorAll('[split-by]')

    splitTargets.forEach(node => {

      let nodes = this.byLetter(node.textContent!)
      console.warn(`splitting: ${node.textContent!} got ${JSON.stringify(nodes)}`)
      for (let i = 0; i++; i < nodes.length - 1) {
        console.info(`nodes(${i}) w/ len=${nodes.length}= ${nodes[i].innerHTML}`)
      }
      //let nodes = this.byLetter(node.innerHTML)
      //console.warn(`splitting: ${node.innerHTML}`)

      //debugger

      //console.log(`modes = ${ JSON.stringify(nodes) }`)

      if (nodes)
        node.childNodes[0].replaceWith(...nodes)
    }
    )
    //}
  }

  // split a srtring into words
  byWord = (text: string) =>
    text.split(' ').map(this.animatedSpan)

  // split a string into letters
  byLetter = (text: string) =>
    [...text].map(this.animatedSpan)


  ngOnDestroy() {
    this.settingsSubscription?.unsubscribe()
  }
}
