import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core'
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

  log = this.document.getElementById("log")


  //constructor(public file: File) { }
  constructor(
    @Inject(DOCUMENT) private document: Document) {

  }
  // src/app/log/log.component.ts:23:22 - error NG2003: No suitable injection token for parameter 'file' of class 'LogComponent'.
  // Consider using the @Inject decorator to specify an injection token.

  ngOnInit(): void {

  }

  // log event in the console
  logEvent(msg: string) {
    if (this.log === null) { throw ("unable to find log...") }
    let dt = new Date()
    let time = Utility.zeroFill(dt.getHours(), 2) + ":" + Utility.zeroFill(dt.getMinutes(), 2) + ":" + Utility.zeroFill(dt.getSeconds(), 2) + ":" + Utility.zeroFill(dt.getMilliseconds(), 4)
    this.log.textContent += time + "-  &nbsp;&nbsp;" + msg + "\n"
    var ot = this.log.scrollHeight - this.log.clientHeight
    if (ot > 0) this.log.scrollTop = ot
  }

  dbug_unused(msg: string, alerts = false) {
    let dt = new Date()
    let time = Utility.zeroFill(dt.getHours(), 2) + ":" + Utility.zeroFill(dt.getMinutes(), 2) + ":" + Utility.zeroFill(dt.getSeconds(), 2) + ":" + Utility.zeroFill(dt.getMilliseconds(), 4)
    let dbugLog = time + "-  &nbsp;&nbsp;" + msg + "<br>" + this.log?.innerHTML
    this.log!.innerHTML = dbugLog
    // TODO: Only if settings say to do this!
    // console.log("RangerTrak: " + dbugLog); // Convert dbugLog from HTML to plain text...
    if (alerts == true) {
      alert("<strong>Alert!</strong> " + time + "-  &nbsp;&nbsp;" + msg);
      //$('#alerts').fadeIn().delay(2500).fadeOut();
    }
  }
}
