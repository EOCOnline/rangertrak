import { Component, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'rangertrak-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})


export class AlertsComponent implements OnInit {
  isAlertHidden: boolean


  constructor() {
    this.isAlertHidden = false;
  }

  ngOnInit(): void {
  }

  onClickEvent() {
    this.isAlertHidden = true;
  }

  dbug(msg: string, alerts: boolean) {
    var dt = new Date();
    var dbugLog = document.getElementById("dbugLog")
    var time = this.zeroFill(dt.getHours(), 2) + ":" + this.zeroFill(dt.getMinutes(), 2) + ":" + this.zeroFill(dt.getSeconds(), 2) + ":" + this.zeroFill(dt.getMilliseconds(), 4);
    if (dbugLog) {
      var dbugMsg = time + "-  &nbsp;&nbsp;" + msg + "<br>" + dbugLog.innerHTML;
      dbugLog.innerHTML = dbugMsg;
    }
    // TODO: Only if settings say to do this!
    // console.log("Ranger Track: " + dbugMsg); // Convert dbugLog from HTML to plain text...
    if (alerts == true) {
      //document.getElementById('#alerts').html("<strong>Alert!</strong> "+time + "-  &nbsp;&nbsp;" + msg);
      //document.getElementById('#alerts').fadeIn().delay(2500).fadeOut();
    }
  }

  zeroFill(integ: number, lngth: number) {
    var strg = integ.toString();
    while (strg.length < lngth)
      strg = "0" + strg;
    return strg;
  }

}


