import { DOCUMENT } from '@angular/common';
import { Component, ComponentFactoryResolver, Inject, OnInit } from '@angular/core'
//import { Event } from '@angular/animations'
//import { File } from '@ionic-native/file/ngx';

import { SettingsService } from "../shared/services"
import { Utility } from "../shared"

@Component({
  selector: 'rangertrak-log',
  templateUrl: './log.component.html', //'home.page.html'
  styleUrls: ['./log.component.scss'] //, 'home.page.scss']
})
export class LogComponent { //implements OnInit
  // If this should be a singleton, consider:  https://angular.io/guide/ngmodule-faq#what-is-the-forroot-method

  logpanel = this.document.getElementById("log")

  //constructor(public file: File) { }
  constructor(
    @Inject(DOCUMENT) private document: Document) {

  }
  // src/app/log/log.component.ts:23:22 - error NG2003: No suitable injection token for parameter 'file' of class 'LogComponent'.
  // Consider using the @Inject decorator to specify an injection token.

  ngOnInit(): void {

  }

  // log event in the console
  log(msg: string, klass:string='log') {
    if (this.logpanel === null) { throw ("unable to find log...") }
    if (klass!="log" && klass!="warn" && klass!="err") { // classes found in the scss file
      console.warn (`log got unknown class: ${klass}`)
      klass="log"
    }
    let dt = new Date()
    let time = Utility.zeroFill(dt.getHours(), 2) + ":" + Utility.zeroFill(dt.getMinutes(), 2) + ":" + Utility.zeroFill(dt.getSeconds(), 2) + ":" + Utility.zeroFill(dt.getMilliseconds(), 4)

    this.logpanel.innerHTML += `<span class="${klass}">${time} -   ${msg}</span> \n`
    //this.log.textContent += time + "-  &nbsp;&nbsp;" + msg + "\n"

    let ot = this.logpanel.scrollHeight - this.logpanel.clientHeight
    if (ot > 0) this.logpanel.scrollTop = ot
  }

  dbug_unused(msg: string, alerts = false) {
    let dt = new Date()
    let time = Utility.zeroFill(dt.getHours(), 2) + ":" + Utility.zeroFill(dt.getMinutes(), 2) + ":" + Utility.zeroFill(dt.getSeconds(), 2) + ":" + Utility.zeroFill(dt.getMilliseconds(), 4)
    let dbugLog = time + "-  &nbsp;&nbsp;" + msg + "<br>" + this.logpanel?.innerHTML
    this.logpanel!.innerHTML = dbugLog
    // TODO: Only if settings say to do this!
    // console.log("RangerTrak: " + dbugLog); // Convert dbugLog from HTML to plain text...
    if (alerts == true) {
      alert("<strong>Alert!</strong> " + time + "-  &nbsp;&nbsp;" + msg);
      //$('#alerts').fadeIn().delay(2500).fadeOut();
    }
  }
}
