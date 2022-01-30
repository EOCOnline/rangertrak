import { DOCUMENT } from '@angular/common'
import { Component, Inject, OnInit, ViewChild, isDevMode } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Observable, debounceTime, map, startWith } from 'rxjs'

import { AlertsComponent } from '../alerts/alerts.component'
import { FieldReportService, FieldReportStatuses, RangerService, RangerType, SettingsService, TeamService } from '../shared/services/'
import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'

let marker: google.maps.Marker
const Vashon: google.maps.LatLngLiteral = { lat: 47.4471, lng: -122.4627 }

@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss'],
  providers: [RangerService, FieldReportService, SettingsService, TeamService]
})
export class EntryComponent implements OnInit {

  @ViewChild(GoogleMap, { static: false }) map!: GoogleMap // even needed?

  display?: google.maps.LatLngLiteral;
  vashon = new google.maps.LatLng(47.4471, -122.4627)

  // google.maps.Map is NOT the same as GoogleMap...
  gMap?: google.maps.Map
  map2?: google.maps.Map
  zoom = 13
  center: google.maps.LatLngLiteral = Vashon
  options: google.maps.MapOptions = {
    zoomControl: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    mapTypeId: 'hybrid',
    maxZoom: 18,
    minZoom: 8,
    draggableCursor: 'crosshair', // https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
    //heading: 90,
  }


  callsignCtrl = new FormControl()
  filteredRangers: Observable<RangerType[]>
  rangers: RangerType[] = []
  fieldReportStatuses
  settings
  entryDetailsForm!: FormGroup

  submitInfo: HTMLElement | null = null
  callInfo: HTMLElement | null = null
  alert: any

  constructor(
    private formBuilder: FormBuilder,
    private rangerService: RangerService,
    private fieldReportService: FieldReportService,
    private settingsService: SettingsService,
    private teamService: TeamService,
    private _snackBar: MatSnackBar,
    @Inject(DOCUMENT) private document: Document) {   //, private service: PostService) {

    this.rangers = rangerService.GetRangers() // TODO: or getActiveRangers?!

    this.alert = new AlertsComponent(this._snackBar, this.document)// TODO: Use Alert Service to avoid passing along doc & snackbar properties!!!!
    if (this.rangers.length < 1) {
      this.alert.Banner('Welcome! First load your rangers - at the bottom of the Rangers page.', 'Go to Rangers page', 'Ignore')
      //this.alert.OpenSnackBar(`No Rangers exist. Please go to Advance section at bottom of Ranger page!`, `No Rangers yet exist.`, 2000)
      //TODO: Force navigation to /Rangers?
    }

    this.fieldReportService = fieldReportService
    this.fieldReportStatuses = FieldReportStatuses
    this.settings = SettingsService.Settings

    // NOTE: workaround for onChange not working...
    this.callsignCtrl.valueChanges.pipe(debounceTime(700)).subscribe(newCall => this.CallsignChanged(newCall))

    // https://material.angular.io/components/autocomplete/examples#autocomplete-overview
    this.filteredRangers = this.callsignCtrl.valueChanges.pipe(
      startWith(''),
      map(callsign => (callsign ? this._filterRangers(callsign) : this.rangers.slice())),
    )
  }

  private _filterRangers(value: string): RangerType[] {
    const filterValue = value.toLowerCase()
    this.entryDetailsForm.value.callsign = filterValue
    return this.rangers.filter((ranger1) => ranger1.callsign.toLowerCase().includes(filterValue))
  }

  displayHide(htmlElementID: string) {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "hidden";
    }
  }

  displayShow(htmlElementID: string) {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "visible";
    }
  }

  ngOnInit(): void {
    console.log(`EntryForm test started at ${Date()} with development mode ${isDevMode() ? "" : "NOT "}enabled`)
    console.log("EntryComponent - ngOnInit - Use settings to fill form")

    // https://angular.io/api/router/Resolve - following fails as SettingsComponent has yet to run...
    // or even https://stackoverflow.com/questions/35655361/angular2-how-to-load-data-before-rendering-the-component

    console.log(`Running ${this.settings.application} version ${this.settings.version}`)

    this.entryDetailsForm = this.formBuilder.group({
      id: -1,
      callsign: [''],
      team: ['T1'],
      address: ['default location (ngOnInit)'],
      lat: [this.settings.defLat, Validators.required], //Validators.minLength(4)
      long: [this.settings.defLong, Validators.required], //Validators.minLength(4)
      date: [new Date()],
      status: [FieldReportStatuses[0]],   // TODO: Allow changing list & default of statuses in settings?!
      note: ['']
    })

    this.submitInfo = this.document.getElementById("enter__Submit-info")

    if (!this.settings.debugMode) {
      this.displayHide("enter__frm-reguritation")
    }

    console.log(`EntryForm ngOnInit completed at ${Date()}`)
  }



  private findIndex(call: string): number {
    for (let i = 0; i < this.rangers.length; i++) {
      if (this.rangers[i].callsign == call) return i;
    }
    throw new Error(`Entry-findIndex(): Ranger with id ${call} was not found!`);
  }

  CallsignChanged(callsign: string) { // Just serves timer for input field - post interaction
    this.callInfo = this.document.getElementById("enter__Callsign-upshot")
    if (this.callInfo) {
      console.log(`EntryForm CallsignChanged looking for ${callsign}`)
      let ranger = this.rangers[this.findIndex(callsign)];
      this.callInfo.innerHTML = `<img class="enter__Callsign-img" aria-hidden
      src="${ranger.image}" height="50">
      <span>${ranger.callsign}</span> | <small> ${ranger.licensee} | ${ranger.phone}</small>`
    }
  }

  CallsignCtrlChanged() { // NOTE: NEVER CALLED!!!, so use workaround above...
    console.log("callsign Ctrl Changed at ", Date(), ". call=" + "myCall")
    // TODO: update #enter__Callsign-upshot
  }

  // FUTURE: provider nicer time picker: https://www.freakyjolly.com/angular-material-109-datepicker-timepicker-tutorial/#Only_Show_Timepicker
  /*
    FUTURE: Allow entry of keywords
    get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls
  }   */

  // sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

  /*
    https://www.sitepoint.com/css3-animation-javascript-event-handlers/
    https://css-tricks.com/controlling-css-animations-transitions-javascript/
    https://www.smashingmagazine.com/2013/04/css3-transitions-thank-god-specification/#a2
    https://stackoverflow.com/questions/6268508/restart-animation-in-css3-any-better-way-than-removing-the-element
    https://css-tricks.com/restart-css-animation/
    https://gist.github.com/paulirish/5d52fb081b3570c81e3a
  */
  reset_animation(element: HTMLElement) {
    console.log(`Fade Animation reset`)
    element.style.animation = 'none';
    element.offsetHeight; // trigger reflow
    element.style.animation = "";
  }

  // TODO: This also gets called if the Update Location button is clicked!!
  onFormSubmit(formData1: string): void {
    console.log(`Form submit at ${Date()}`)
    let formData = JSON.stringify(this.entryDetailsForm.value)

    let newReport = this.fieldReportService.addfieldReport(formData)
    console.log(`Report id # ${newReport.id} has been added.`)
    console.log("formData:  " + formData)
    //console.log("formData1: " + JSON.stringify(formData1))

    if (this.submitInfo) {
      // Display fading confirmation to right of Submit button
      this.submitInfo.innerText = `Entry id # ${newReport.id} Saved. ${formData}`
      this.reset_animation(this.submitInfo)
    }
    else {
      console.log("NO this.submitInfo ID FOUND!!!")
    }
    this.alert.OpenSnackBar(`Entry id # ${newReport.id} Saved: ${formData}`, `Entry id # ${newReport.id}`, 2000)

    //this.entryDetailsForm.reset() // std reset just blanks values, doesn't initialize them...
    this.resetForm()
  }


  // TODO: Reset form: Callsign to blank, current date, status/note
  resetForm() {
    console.log("Resetting form...")

    this.entryDetailsForm = this.formBuilder.group({
      id: -2,
      callsign: [''],
      team: ['T0'],
      address: ['default location (reset)'],
      lat: [this.settings.defLat,
      Validators.required,
        //Validators.minLength(4)
      ],
      long: [this.settings.defLong,
      Validators.required,
        //Validators.minLength(4)
      ],
      date: [new Date()],
      status: [FieldReportStatuses[this.settings.defRangerStatus]],   // TODO: Allow changing list & default of statuses in settings?!
      note: ['']
    })
  }

  updateLocation() {
    console.log("updateLocation() running")
    //this.entryDetailsForm.get(['', 'name'])
    //this.entryDetailsForm.controls['derivedAddress'].setValue('New Derived Address')
    var addr = this.document.getElementById("derivedAddress")
    if (addr) { addr.innerHTML = "New What3Words goes here!" }
    this.displayMarker(this.vashon)
  }

  // ------------------------------------------------------------------------
  // Map stuff below

  onMapInitialized(mappy: google.maps.Map) {
    console.log(`onMapInitialized()`)
    this.gMap = mappy

    if (this.gMap == null) {
      console.log("onMapInitialized(): This.gMap is null")
    } else {
      console.log(`onMapInitialized(): this.gMap zoom =${this.gMap.getZoom()}`)
    }
    //this.createOverviewMap()
    this.updateOverviewMap()
  }

  zoomIn() {
    if (this.options.maxZoom != null) {
      if (this.zoom < this.options.maxZoom) this.zoom++
    }
  }

  zoomOut() {
    if (this.options.minZoom != null) {
      if (this.zoom > this.options.minZoom) this.zoom--
    }
  }

  updateOverviewMap() {
    // https://developers.google.com/maps/documentation/javascript/examples/marker-simple#maps_marker_simple-typescript

    let latlng = new google.maps.LatLng (SettingsService.Settings.defLat, SettingsService.Settings.defLong)
    this.gMap?.setCenter(latlng)
    this.gMap.s
    // this.gMap?.setZoom(14)
    // this.gMap?.setOptions({draggableCursor:"crosshair"}) // https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
  }

  createOverviewMap_UNUSED() {
    // https://developers.google.com/maps/documentation/javascript/examples/marker-simple#maps_marker_simple-typescript

    // TODO: this.map2 or this.gMap????
    this.map2 = new google.maps.Map(
      document.getElementById("map") as HTMLElement,
      {
        zoom: 13,
        center: { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong },
        draggableCursor: 'crosshair'
      }
    );

  }

  displayMarker(pos: google.maps.LatLng, titl = 'Latest Location') {
    let onlyMarker = new google.maps.Marker({
      draggable: false,
      animation: google.maps.Animation.DROP,
      map: this.gMap,
      position: pos,
      title: titl,
      /* label: {
         // label: this.labels[this.labelIndex++ % this.labels.length],
         text: "grade", // https://fonts.google.com/icons: rocket, join_inner, noise_aware, water_drop, etc.
         fontFamily: "Material Icons",
         color: "#ffffff",
         fontSize: "18px",
       },
       */
      // label: labels[labelIndex++ % labels.length],
    })
  }

  move(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.display = event.latLng.toJSON()
      console.log('moveing()');
    }
    else{
      console.log('move(): NO event.latLng!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    }
  }

   // from https://developers.google.com/maps/documentation/javascript/examples/control-replacement
   // TODO: Doesn't work...
   initZoomControl(map: google.maps.Map) {
    console.log('starting initZoomControl()');

    (document.querySelector(".zoom-control-in") as HTMLElement).onclick =
      function () {
        map.setZoom(map.getZoom()! + 1);
      };

    (document.querySelector(".zoom-control-out") as HTMLElement).onclick =
      function () {
        map.setZoom(map.getZoom()! - 1);
      };

    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(
      document.querySelector(".zoom-control") as HTMLElement
    );
  }

  initZoomControl2() {
    if (this.gMap) {
      console.log('try initZoomControl()')
      this.initZoomControl(this.gMap)
    } else {
      console.log('gMap is null, so no initZoomControl()')
    }
  }

}
