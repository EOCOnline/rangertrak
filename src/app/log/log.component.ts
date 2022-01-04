import { Component, OnInit } from '@angular/core'
//import { Event } from '@angular/animations'

// https://blogs.sitepointstatic.com/examples/tech/animation-api/index.html
@Component({
  selector: 'rangertrak-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent implements OnInit {

  anim: HTMLElement | null = null
  log = document.getElementById("log")
  pfx = ["webkit", "moz", "MS", "o", ""]

  constructor() {
  }

  ngOnInit(): void {
    this.anim = document.getElementById("anim")
    if (this.anim === null) {
      throw ("unable to find anim...")
    }

   {
         // button click event
         /*
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLAnchorElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

addEventListener(type: "click", listener: (this: HTMLElement, ev: MouseEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void
Appends an event listener for events whose type attribute value is type. The callback argument sets the callback that will be invoked when the event is dispatched.
The options argument sets listener-specific options. For compatibility this can be a boolean, in which case the method behaves exactly as if the value was specified as options's capture.
When set to true, options's capture prevents callback from being invoked when the event's eventPhase attribute value is BUBBLING_PHASE. When false (or not present), callback will not be invoked when event's eventPhase attribute value is CAPTURING_PHASE. Either way, callback will be invoked if event's eventPhase attribute value is AT_TARGET.
When set to true, options's passive indicates that the callback will not cancel the event by invoking preventDefault(). This is used to enable performance optimizations described in § 2.8 Observing event listeners.
When set to true, options's once indicates that the callback will only be invoked once after which the event listener will be removed.
If an AbortSignal is passed for options's signal, then the event listener will be removed when signal is aborted.
The event listener is appended to target's event listener list and is not appended if it has the same type, callback, and capture.

    */
    // this.anim.addEventListener("click", this.ToggleAnimation, false ) // this.ToggleAnimation  listener: (this: HTMLElement, ev: MouseEvent) => any

    /*  (property) LogComponent.anim: HTMLElement
    Argument of type 'HTMLElement' is not assignable to parameter of type 'HTMLAnchorElement'.
      Type 'HTMLElement' is missing the following properties from type 'HTMLAnchorElement': charset, coords, download, hreflang, and 21 more.ts(2345)

    any
    Property 'click' does not exist on type '{ new (type: string, eventInitDict?: MouseEventInit | undefined): MouseEvent; prototype: MouseEvent; }'.ts(2339)

    document.getElementById('demo').onclick = function changeContent() {
       document.getElementById('demo').textContent = "Help me";
       document.getElementById('demo').style = "Color: red";
    }
    */
  }

    // animation listener events
    this.PrefixedEvent(this.anim, "AnimationStart", this.AnimationListener)
    this.PrefixedEvent(this.anim, "AnimationIteration", this.AnimationListener)
    this.PrefixedEvent(this.anim, "AnimationEnd", this.AnimationListener)
  }

  // apply prefixed event handlers
  PrefixedEvent(element: HTMLElement, type: string, callback: any) {
    for (var p = 0; p < this.pfx.length; p++) {
      if (!this.pfx[p]) type = type.toLowerCase()
      element.addEventListener(this.pfx[p] + type, callback, false)
    }
  }

  // handle animation events
  // https://developer.mozilla.org/en-US/docs/Web/API/AnimationEvent
  AnimationListener(e: AnimationEvent) {
    // e = AnimationEvent {isTrusted: true, animationName: 'flash', elapsedTime: 0, pseudoElement: '', type: 'animationstart', …}
    this.LogEvent("Animation '" + e.animationName + "' type '" + e.type + "' at " + e.elapsedTime.toFixed(2) + " seconds")
    if (e.type.toLowerCase().indexOf("animationend") >= 0) {
      this.LogEvent("Stopping animation...")
      this.ToggleAnimation(e)
    }
  }

  // e = PointerEvent {isTrusted: true, pointerId: 1, width: 1, height: 1, pressure: 0, …}
  //listener (el: HTMLElement, ev: AnimationEvent) : any {

  // start/stop animation
  ToggleAnimation(e: Event) {
    //ToggleAnimation( el: HTMLElement, e: AnimationEvent|null) {
    if (this.anim === null) {
      throw ("unable to find anim... in ToggleAnimation")
    }
    var on = (this.anim.className != "")
    this.LogEvent("Animation is " + (on ? "disabled.\n" : "enabled."))
    this.anim.textContent = "Click to " + (on ? "start" : "stop") + " animation"
    this.anim.className = (on ? "" : "enable")
    if (e) e.preventDefault()
  }

  ToggleAnimation2() {
    //ToggleAnimation( el: HTMLElement, e: AnimationEvent|null) {
    if (this.anim === null) {
      throw ("unable to find anim... in ToggleAnimation2")
    }
    var on = (this.anim.className != "")
    this.LogEvent("Animation is " + (on ? "disabled.\n" : "enabled."))
    this.anim.textContent = "Click to " + (on ? "start" : "stop") + " animation"
    this.anim.className = (on ? "" : "enable")
    //if (e) e.preventDefault()
  }

  // log event in the console
  LogEvent(msg: string) {
    if (this.log === null) { throw ("unable to find log...") }
    this.log.textContent += msg + "\n"
    var ot = this.log.scrollHeight - this.log.clientHeight
    if (ot > 0) this.log.scrollTop = ot
  }
}
