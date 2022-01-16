import { BehaviorSubject, Observer } from 'rxjs';
import { Injectable, OnInit } from '@angular/core';
//import { JSONSchema, LocalStorage, StorageMap } from '@ngx-pwa/local-storage';
import { RangerService, RangerStatus, TeamService } from './index';

export enum FieldReportSource { Voice, Packet, APRS, Email }

export const FieldReportStatuses = [
  'None', 'Normal', 'Need Rest', 'Urgent', 'Objective Update', 'Check-in', 'Check-out'
]

export type FieldReportType = {
  id: number,
  callsign: String, team: String,
  address: String, lat: Number, long: Number,
  date: Date,
  status: String, note: String
}

@Injectable({ providedIn: 'root' })
export class FieldReportService {

  private fieldReports: FieldReportType[] = []
  private storageLocalName = 'fieldReports'
  private nextId = 0
  private fieldReportsSubject =
    new BehaviorSubject<FieldReportType[]>([]);  // REVIEW: Necessary?

  constructor(private rangerService: RangerService, private teamService: TeamService) {

    console.log("Contructing FieldReportService: once or repeatedly?!--------------") // XXX
    console.log(`FieldReport length= ${this.fieldReports.length}`) // XXX

    let localStorageFieldReports = localStorage.getItem(this.storageLocalName)
    /* this.fieldReports = []
    if (temp != null) {
      this.fieldReports = JSON.parse(temp) || []
    }   */

    // XXX (localStorageFieldReports != null)= true
    this.fieldReports = ((localStorageFieldReports != null) && (localStorageFieldReports.indexOf("licensee")<=0))
      ? JSON.parse(localStorageFieldReports) : []   //TODO: clean up
    //this.fieldReports = []
    //debugger
    //console.log(`this.fieldReports.length=${this.fieldReports.length}; (localStorageFieldReports != null)= ${localStorageFieldReports != null}`)

    console.log(`FieldReport from localstorage length= ${this.fieldReports.length}`) // XXX


    if ((localStorageFieldReports != null)) {
      let ugg = JSON.parse(localStorageFieldReports)
      //console.log(`JSON.parse(localStorageFieldReports) ${ugg}`)
    }
    if (this.fieldReports.length > 0) {
      for (const fieldReport of this.fieldReports) {
        if (fieldReport.id >= this.nextId) this.nextId = fieldReport.id + 1
      }
      this.update()
    }
  }

  subscribe(observer: Observer<FieldReportType[]>) {
    this.fieldReportsSubject.subscribe(observer);
  }

  // TODO: verify new report is proper shape/validated here or by caller??? Send as string or object?
  addfieldReport(formData: string): FieldReportType {
    console.log(`FieldReportService: Got new field report: ${formData}`)

    let newReport: FieldReportType = JSON.parse(formData)
    newReport.id = this.nextId++
    this.fieldReports.push(newReport)

    this.update();
    return newReport;
  }

  getFieldReport(id: number) {
    const index = this.findIndex(id);
    return this.fieldReports[index];
  }

  updateFieldReport(report: FieldReportType) {
    const index = this.findIndex(report.id);
    this.fieldReports[index] = report;
    this.update();
  }

  deleteFieldReport(id: number) {
    const index = this.findIndex(id);
    this.fieldReports.splice(index, 1);
    this.update();
  }

  deleteAllFieldReports() {
    this.fieldReports = []
    localStorage.removeItem(this.storageLocalName)
  }

  private update() {
    localStorage.setItem(this.storageLocalName, JSON.stringify(this.fieldReports));

    this.fieldReportsSubject.next(this.fieldReports.map(
      fieldReport => ({
        id: fieldReport.id,
        callsign: fieldReport.callsign,
        team: fieldReport.team,
        address: fieldReport.address,
        lat: fieldReport.lat,
        long: fieldReport.long,
        date: fieldReport.date,
        status: fieldReport.status,
        note: fieldReport.note
      })
    ))
  }

  private findIndex(id: number): number {
    for (let i = 0; i < this.fieldReports.length; i++) {
      if (this.fieldReports[i].id === id) return i;
    }
    throw new Error(`FieldReport with id ${id} was not found!`);
  }

  getFieldReports() {
    return this.fieldReports
  }

  sortFieldReportsByCallsign() {
    return this.fieldReports.sort((n1, n2) => {
      if (n1.callsign > n2.callsign) { return 1 }
      if (n1.callsign < n2.callsign) { return -1 }
      return 0;
    })
  }

  sortFieldReportsByDate() {
    return this.fieldReports.sort((n1, n2) => {
      if (n1.date > n2.date) { return 1 }
      if (n1.date < n2.date) { return -1 }
      return 0;
    })
  }

  /*
const filterParams = {
  comparator: (filterLocalDateAtMidnight: any, cellValue: any) => {
    const dateAsString = cellValue;
    const dateParts = dateAsString.split('/');
    const cellDate = new Date(
      Number(dateParts[2]),
      Number(dateParts[1]) - 1,
      Number(dateParts[0])
    );
    if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
      return 0;
    }
    if (cellDate < filterLocalDateAtMidnight) {
      return -1;
    }
    //if (cellDate > filterLocalDateAtMidnight) {
    return 1;
    //}
  },
}
*/

  sortFieldReportsByTeam() {
    return this.fieldReports.sort((n1, n2) => {
      if (n1.team > n2.team) { return 1 }
      if (n1.team < n2.team) { return -1 }
      return 0;
    })
  }

  filterFieldReportsByDate(beg: Date, end: Date) { // Date(0) = January 1, 1970, 00:00:00 Universal Time (UTC)
    const minDate = new Date(0)
    const maxDate = new Date(2999, 0)
    beg = beg < minDate ? beg : minDate
    end = (end < maxDate) ? end : maxDate

    return this.fieldReports.filter((report) => (report.date >= beg && report.date <= end))
  }


  generateFakeData(num: number = 15) {

    let teams = this.teamService.getTeams()
    let rangers = this.rangerService.getRangers()
    if (rangers == null || rangers.length < 1) {
      alert("No Rangers! Please add some 1st.")
      return
    }
    const streets = ["Ave", "St.", "Pl.", "Court", "Circle"]
    const notes = ["Reports beautiful sunrise", "Roudy Kids", "Approaching Neighborhood CERT", "Confused & dazed in the sun",
      "Wow", "na", "Can't hear you", "Bounced via tail of a comet!", "Need confidential meeting: HIPAA", "Getting overrun by racoons"]

    const msSince1970 = new Date().getTime()
    console.log(`Generating ${num} FAKE field reports... with base of ${msSince1970}`)

    for (let i = 0; i < num; i++) {
      this.fieldReports.push({
        id: this.nextId++,
        callsign: rangers[Math.floor(Math.random() * rangers.length)].callsign,
        team: teams[Math.floor(Math.random() * teams.length)].name,
        address: (Math.floor(Math.random() * 10000)) + " SW " + streets[(Math.floor(Math.random() * streets.length))],
        lat: 45 + Math.floor(Math.random() * 2000) / 1000,
        long: -121 + Math.floor(Math.random() * 1000) / 1000,
        date: new Date(Math.floor(msSince1970 - (Math.random() * 25 * 60 * 60 * 1000))), // 0-25 hrs earlier
        status: FieldReportStatuses[Math.floor(Math.random() * FieldReportStatuses.length)],
        note: notes[Math.floor(Math.random() * notes.length)]
      })
    }
  }

}
/*
@Injectable({ providedIn: 'root' })
export class FieldReport {
}
*/

// from https://ag-grid.com/angular-data-grid/column-definitions/#example-column-definition
//import { HttpClient } from '@angular/common/http';
/*
onGridReady(params) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;

    this.http
      .get('https://www.ag-grid.com/example-assets/olympic-winners.json')
      .subscribe((data) => params.api.setRowData(data));
  }
  */



/*

OLD CODE FROM 4.2 ===============================================================================================

function filterLocations(filters) {

  // clear any previous markers
  clearLeafletMarkers();
  clearGoogMarkers();
  clearEsriMarkers();

  // Track min/max marker bounds
  var arrayOfLatLngs = [];
  var _this = this;
  var minLat=Infinity, minLng=Infinity, maxLat=-Infinity, maxLng=-Infinity;

  // setup a marker group
  // TODO: Move to map provider layer...
  var markers = L.markerClusterGroup();
  markers.clearLayers();
  //mapLeafletMarkers;


  if (teamLocations) {
  for (var i = 0; i < teamLocations.length; i++) {
    //dbug("Displaying marker "+i);
    // https://leafletjs.com/reference-1.4.0.html#marker
    var llat = teamLocations[i].Latitude;
    var llong = teamLocations[i].Longitude;

    /* Alternatives:
      // function myArrayMax(arr) {  return Math.max.apply(null, arr);   }
      // or by another index/object
      // var cars = [  {type:"Volvo", year:2016},   {type:"Saab", year:2001} ];   cars.sort(function(a, b){return a.year - b.year});
      // for string properties:
      // cars.sort(function(a, b){ var x = a.type.toLowerCase();  var y = b.type.toLowerCase();  if (x < y) {return -1;}  if (x > y) {return 1;}  return 0; });

      // new filtered array:
      // BUT: 11% slower: https://jsperf.com/array-filter-performance
      // var numbers = [45, 4, 9, 16, 25]; var over18 = numbers.filter(myFunction);  function myFunction(value, index, array) {  return value > 18;  }

      https://stackoverflow.com/questions/10557486
      https://api.jquery.com/jQuery.grep/
    * /

    if (filters!=null) {
      // Process Filters...
      //dbug("Filters Received");

      //Filter Team?
      //dbug("Team["+i+"]="+teamLocations[i].Team);
      if (filters.Team.length!=0 && (teamLocations[i].Team!=filters.Team)) {
        dbug("#### Filtered out Team: ["+i+"]="+teamLocations[i].Team);
        continue;
      }

      // Filter CallSign?
      //dbug("Call["+i+"]="+teamLocations[i].CallSign);
      if (filters.CallSign.length!=0 && (teamLocations[i].CallSign!=filters.CallSign)) {
        dbug("#### Filtered out CallSign: ["+i+"]="+teamLocations[i].CallSign);
        continue;
      }

      // Filter based on time?
      //dbug("Time["+i+"]  =  "+teamLocations[i].Date);
      //dbug("BaseTime="+filters.BaseTime+"; minutes="+filters.Minutes);
      //dbug("Minutes="+Date.parse(teamLocations[i].Date)/60000.0);

      //dbug("Time Diff="+Math.abs(Date.parse(teamLocations[i].Date) - Date.parse(filters.BaseTime))/60000.0+"<br><br>");

      // Milliseconds/minute = 60+1000
      if (filters.Minutes!=0 && filters.BaseTime.length!=0 &&
      (Math.abs(Date.parse(teamLocations[i].Date) - Date.parse(filters.BaseTime)) >= filters.Minutes*60000.0) ) {
        dbug("#### Filtered out Time: ["+i+"]="+teamLocations[i].CallSign);
        continue;
      }
    }

    minLat = Math.min(minLat,llat);
    minLng = Math.min(minLng,llong);
    maxLat = Math.max(maxLat,llat);
    maxLng = Math.max(maxLng,llong);

    // setup the bounds
    arrayOfLatLngs.push([llat,llong]);

    // dbug("Coords='" + llat + ", " + llong + "'");
    // dbug("Map bounds reset to: ["+minLat+","+minLng+"], ["+maxLat+","+maxLng+"]");

    var color = defTeamColor;
    var shape = defTeamShape;
    var fillColor = defTeamFillColor;
    var fillOpacity = defTeamOpacity;

    var numTeams = teams.length;
    var teamsIndex;

    var team = teamLocations[i].Team;
    // dbug("teamLocations["+i+"]="+team);

    for (teamsIndex=0; teamsIndex<numTeams; teamsIndex++) {
      // dbug("filterLocations: teams["+teamsIndex+"].value='"+teams[teamsIndex].value+"' == team='"+team+"'");
      if (teams[teamsIndex].value == team) {
        color = teams[teamsIndex].color; //TODO: if !empty // BUGBUG: Likely assumes every team has values in the teams array. Unlikely, hah!
        fillColor = teams[teamsIndex].fillColor;
        //fillOpacity = teams[teamIndex].fillOpacity;
        shape = teams[teamsIndex].shape;
        // dbug("filterLocations: Teams index="+teamsIndex + "; color:"+color+"; fillColor:"+fillColor+"; fillOpacity:"+fillOpacity+"; shape:"+shape);
        break;
      }
    }




    displayLeafletMarkers();
    displayGoogMarkers();
    displayEsriMarkers();



    var newMarker;

    switch(shape) {
      case "Marker":
        // https://leafletjs.com/reference-1.4.0.html#icon

        var myIcon = L.icon({
              iconUrl: (iconDir+teams[teamsIndex].icon),
              iconSize: [32, 37],
              iconAnchor: [20, 20],
              popupAnchor: [-5, -5],
              //shadowUrl: 'my-icon-shadow.png',
              //shadowSize: [68, 95],
              //shadowAnchor: [22, 94]
          });

        newMarker = L.marker([llat, llong], {icon: myIcon}
            // , title: teamLocations[i].CallSign + "<br>" + teamLocations[i].Date
            )
            .bindPopup(
              teamLocations[i].CallSign + " - " + teamLocations[i].Licensee + "<br>"
              + teamLocations[i].Date.replace("T", " ") + "<br>"
              + teamLocations[i].FieldReports );
        //dbug("Created Marker. icon=" + iconDir + teams[teamsIndex].icon + "; " );
        break;

      case "Circle":
      default:
        newMarker = L.circle([llat, llong], CIRCLE_SIZE, {
            color: color,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
          }, title="").bindPopup(
              teamLocations[i].CallSign + " - " + teamLocations[i].Licensee + "<br>"
              + teamLocations[i].Date.replace("T", " ") + "<br>"
              + teamLocations[i].FieldReports
            );


      // FieldReport: You may run into issues with the popups closing when you mouse onto the popup itself,
      // so you might need to adjust the popup anchor in (see popup settings) to show your popups a
      // bit farther away from marker itself so it doesn't disappear too easily.
      // http://gis.stackexchange.com/questions/31951/ddg#95795

      /*
        // sample code for having all popups open if users hovers over any point...
        var markers = getAllMarkers(); // up to you to implement, say it returns an Array<L.Marker>
        for (var i = 0; i < markers.length; i++) {
            var currentMarker = markers[i];
            currentMarker.on('mouseover', currentMarker.openPopup.bind(currentMarker));
        }
      * /
      //dbug("Created Circle!");
      //Done with this row, get next
      break;
    }

    newMarker.on('mouseover', function (e) { this.openPopup();  });
    newMarker.on('mouseout' , function (e) { this.closePopup(); });

    // marker.bindPopup(View(event));
    // add marker
    markers.addLayer(newMarker);
  } // Done adding this row to the map

  // https://stackoverflow.com/questions/14106687/how-do-i-change-the-default-cursor-in-leaflet-maps
  bigMap.on('click', onMapClick);
  $('.leaflet-container').css('cursor','crosshair'); // reset cursor with ''!

  // Display coordinates if map is clicked
  var popup = L.popup();

  function onMapClick(e) {
    popup
      .setLatLng(e.latlng)
      .setContent(e.latlng.toString())
      .openOn(bigMap);
  }

  // add the group to the map
  // for more see https://github.com/Leaflet/Leaflet.markercluster
  //markerCluster needs maxzoom
  bigMap.addLayer(markers);

  //markers.on('clusterclick', function (a) {
  //// markers.zoomToBounds({padding: [20, 20]});
  //});

  /*markers.on('clusterclick', function (a) {
    a.layer.zoomToBounds();
  });
  * /

  var bounds = new L.LatLngBounds(arrayOfLatLngs);
  bigMap.fitBounds(bounds);
  bigMap.invalidateSize();

// TODO: Zoom in to closest view that shows all points:
// https://leafletjs.com/reference-1.4.0.html#map-methods-for-modifying-map-state
// dbug("Set map bounds to: ["+minLat+","+minLng+"], ["+maxLat+","+maxLng+"]");
// bigMap.fitBounds(L.latLngBounds([minLat,minLng], [maxLat,maxLng]));
// bigMap.fitBounds([minLat,minLng], [maxLat,maxLng]);

// bigMap.updateSize();
//bigMap.invalidateSize(true);
// GridLayer.redraw()
// bigMap._onResize();
  }

  */
