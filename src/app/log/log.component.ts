import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core'
//import { Event } from '@angular/animations'
//import { File } from '@ionic-native/file/ngx';

import { SettingsService } from "../shared/services"

@Component({
  selector: 'rangertrak-log',
  templateUrl: './log.component.html', //'home.page.html'
  styleUrls: ['./log.component.scss'] //, 'home.page.scss']
})
export class LogComponent implements OnInit {

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
  LogEvent(msg: string) {
    if (this.log === null) { throw ("unable to find log...") }
    this.log.textContent += msg + "\n"
    var ot = this.log.scrollHeight - this.log.clientHeight
    if (ot > 0) this.log.scrollTop = ot
  }
}
