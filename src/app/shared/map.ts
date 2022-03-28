import * as C from "./coordinate"
import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild, OnDestroy } from '@angular/core'
import { DOCUMENT, JsonPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Observable, Subscription } from 'rxjs'
import { catchError, mergeMap, toArray } from 'rxjs/operators';

import { SettingsService, FieldReportService, FieldReportType, FieldReportStatusType, FieldReportsType, LogService, SettingsType } from '../shared/services'

export enum MapType {
  Google,
  ESRI_Leaflet
}

export interface LayerType {
  id: number
  url: string,
  id2: string,
  attribution: string
}

/*
  // Interface are general, lightweight vs. abstract classes as special-purpose/feature-rich (pg 96, Programming Typescript)
  export interface IMap {
    type: MapType,
    layers: LayerType
    initMap():void
    displayBeautifulMap(num:number) :void
    }
*/


/**
 *
 * per https://ozak.medium.com/stop-repeating-yourself-in-angular-how-to-create-abstract-components-9726d43c99ab,
 * do NOT use "abstract"!
 *
 * Needs template: https://stackoverflow.com/questions/62222979/angular-9-decorators-on-abstract-base-class
 *
 * https://www.tutorialsteacher.com/typescript/abstract-class
 *
 * https://www.cloudhadoop.com/angular-model-class-interface/
 *
 */
@Component({ template: '' })
export class abstractMap {

  protected id = 'Abstract Map Component'
  public title = 'Abstract Map'

  protected settingsSubscription!: Subscription
  protected settings!: SettingsType

  protected fieldReportsSubscription!: Subscription
  protected fieldReports: FieldReportsType | undefined

  // name: string;
  //date: Date;

  constructor(protected settingsService: SettingsService,
    protected fieldReportService: FieldReportService,
    protected httpClient: HttpClient,
    protected log: LogService,
    @Inject(DOCUMENT) protected document: Document) {
    this.log.verbose(`Constructing Abstract Map`, this.id)

    this.fieldReportService = fieldReportService

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        // REVIEW: Any new settings just ripple thru, or does anything need pushing?!
        this.settings = newSettings
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.fieldReportsSubscription =
      this.fieldReportService.getFieldReportsObserver().subscribe({
        next: (newReport) => {
          this.gotNewFieldReports(newReport)
        },
        error: (e) => this.log.error('Field Reports Subscription got:' + e, this.id),
        complete: () => this.log.info('Field Reports Subscription complete', this.id)
      })


    //this.date = new Date();
    //this.name = name;

    // add validation code here?! or in forms code?

    this.initMap()
  }


  gotNewFieldReports(newReports: FieldReportsType) {
    this.log.verbose(`New collection of ${newReports.numReport} Field Reports observed.`, this.id)

    this.allRows = newReports.numReport
    this.fieldReports = newReports

    this.refreshMap()
    // this.reloadPage()  // TODO: needed?
  }





  /*
    toString(): string {
      return "Map name: " + this.name +
        ";; "
    }
  */
  abstract initMap(): void
  //abstract display(): void

  //onMapClick() { }
}


