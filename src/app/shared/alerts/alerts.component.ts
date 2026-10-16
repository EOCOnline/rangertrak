import { Subscription } from 'rxjs'

import { CommonModule, DOCUMENT } from '@angular/common'
import { Component, Inject, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar'
import { MatCardModule } from '@angular/material/card'
import { NavigationEnd } from '@angular/router'
//import { MatFormFieldModule } from '@angular/material/form-field';
import { MDCBanner } from '@material/banner'

import { MissionService, MissionType } from '../services'
import { LogService } from '../services/log.service'
import { Utility } from '../utility'

// NOTE: Could have long running service worker push a notification if desired: https://angular.io/guide/service-worker-notifications

@Component({
  selector: 'rangertrak-alerts',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, MatCardModule],
  templateUrl: './alerts.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./alerts.component.scss']
})
export class AlertsComponent implements OnInit, OnDestroy {

  private id = 'Alerts Component'
  isAlertHidden: boolean
  private alertBanner: HTMLElement | null = null
  emoji = 'emoji_people'
  private missionSubscription!: Subscription
  private settings!: MissionType

  constructor(
    private _snackBar: MatSnackBar,
    private log: LogService,
    private missionService: MissionService,
    @Inject(DOCUMENT) private document: Document) {
    // ======== Constructor() ============
    this.isAlertHidden = true;
  }

  ngOnInit(): void {
    this.missionSubscription = this.missionService.getMissionObserver().subscribe({
      next: (newMission) => {
        this.settings = newMission
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id)
    })

    // May be null here; Banner() looks it up again on first use.
    this.alertBanner = this.document.querySelector('.mdc-banner')
  }

  Banner(msg: string, action1: string | undefined = 'Close', action2: string | undefined = "Close") {
    // https://material.io/components/banners#usage  //@use "@material/banner/styles";

    // Called before ngOnInit found the banner (or it wasn't rendered yet): look it up now.
    // #81 (2026-09-27): this used to console.log a REVIEW line - the lazy lookup is the
    // intended fallback, not an anomaly.
    if (this.alertBanner == null) {
      this.alertBanner = this.document.querySelector('.mdc-banner')
    }

    if (this.alertBanner != null) {
      const banner = new MDCBanner(this.alertBanner)
      banner.open()
      banner.setText(msg)
      banner.setPrimaryActionText(action1)
      banner.setSecondaryActionText(action2)
      //banner.layout()
    } else {
      this.log.warn(`Could not show the alert banner (no .mdc-banner element): ${msg}`, this.id)
    }
    //this.openSnackBar(`No Rangers found. Please enter them into the grid and then use the Update button,  or provide a Rangers.JSON file to import from or FUTUREE: Import them from an Excel file.`, `Nota Bene`, 1000)
    //  this.openSnackBar(`Imported "${this.rangers.length}" rangers.`, `Nota Bene`, 2000)

  }

  // https://v5.material.angular.io/components/snack-bar/overview
  OpenSnackBar(message: string, action: string, duration = 0) {
    this._snackBar.open(message, action, { duration: duration, verticalPosition: 'top' })
  }

  onBtnCloseAlert() {
  }

  onBtnCloseBottomAlert() {
    this.isAlertHidden = true;
  }

  dbug(msg: string, alerts: boolean) {
    var dt = new Date();
    var dbugLog = document.getElementById("dbugLog")
    var time = Utility.zeroFill(dt.getHours(), 2) + ":" + Utility.zeroFill(dt.getMinutes(), 2) + ":" + Utility.zeroFill(dt.getSeconds(), 2) + ":" + Utility.zeroFill(dt.getMilliseconds(), 4);
    if (dbugLog) {
      var dbugMsg = time + "-  &nbsp;&nbsp;" + msg + "<br>" + dbugLog.innerHTML;
      dbugLog.innerHTML = dbugMsg;
    }
    // TODO: Only if settings say to do this!
    if (alerts == true) {
      //document.getElementById('#alerts').html("<strong>Alert!</strong> "+time + "-  &nbsp;&nbsp;" + msg);
      //document.getElementById('#alerts').fadeIn().delay(2500).fadeOut();
    }
  }

  ngOnDestroy() {
    this.missionSubscription?.unsubscribe()
  }
}


