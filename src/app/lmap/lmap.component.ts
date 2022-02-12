import "leaflet.markercluster"
import * as L from 'leaflet'

import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild } from '@angular/core'
import { DOCUMENT, JsonPipe } from '@angular/common'
import { MarkerService, SettingsService, ShapeService } from '../shared/services'

// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet
// °°°°

//const L = window['L'];

/*
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
})


L.Marker.prototype.options.icon = iconDefault;

let tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Points &copy 2012 LINZ'
})
*/


/*export type addressType = {
title:string;
num: number
}*/

@Component({
  selector: 'rangertrak-lmap',
  templateUrl: './lmap.component.html',
  styleUrls: [
    './lmap.component.scss',
    "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css", // REVIEW: also added to angular.json: needed there?
    '../../../node_modules/leaflet/dist/leaflet.css', // only seems to work when embedded in angula.json & Here! (chgs there REQUIRE restart!)
  ],
  providers: [SettingsService]
})
export class LmapComponent implements AfterViewInit {  //OnInit,
  /*
    lmap: L.Map | undefined
    shapeFile = '/assets/data/gz_2010_us_040_00_5m.json'
    private shapes = undefined

    constructor(
      private markerService: MarkerService,
      private settingsService: SettingsService,
      private shapeService: ShapeService
      //@Inject(DOCUMENT) private document: Document
    ) {  */

  lmap: L.Map | undefined

  constructor() {
    //this.map
  }

  // following NOT declared above, so not called!!!!
  ngOnInit() {
    //https://www.npmjs.com/package/leaflet.markercluster

    let tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Points &copy 2012 LINZ'
    });
  }

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap() {
    console.log("Init Leaflet Map..........")
    this.lmap = L.map('lmap', {
      center: [SettingsService.Settings.defLat, SettingsService.Settings.defLng],
      zoom: 12
    })

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    tiles.addTo(this.lmap)
  }


  // https://stackblitz.com/edit/ts-leaflet-markercluster

  /*
   //console.log("ngAfterViewInit..........")
   this.initMap()

   if (this.lmap) {
     //this.markerService.makeStationMarkers(this.lmap)
     this.markerService.makeCapitalCircleMarkers(this.lmap)
   }
   // NOTE: An even better approach would be to pre-load the data in a resolver.
   this.shapeService.getShapeShapes(this.shapeFile).subscribe((shapes: any) => {
     this.shapes = shapes
     this.initShapesLayer()
   });
 }


// https://developer.what3words.com/tutorial/displaying-the-what3words-grid-on-a-leafletjs-map
// https://developer.what3words.com/tutorial/combining-the-what3words-js-autosuggest-component-with-a-leafletjs-map


const map2 = L.map('googleMapsPlaner', {
center: [POLSKA_SZER_GEOGR, POLSKA_DL_GEOGR],
zoom: POLSKA_ZOOM,
zoomControl: true, layers: [tiles]
});

const markerIcon =
L.icon({
  iconSize: [25, 41],
  iconAnchor: [10, 41],
  popupAnchor: [2, -40],
  // specify the path here
  iconUrl: "https://unpkg.com/leaflet@1.4.0/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.4.0/dist/images/marker-shadow.png"
})


const bergen = {lat:60.3948648649804, long:5.321473714945354}

  const markerCluster = new L.MarkerClusterGroup();

  let marker = L.marker(new L.LatLng(POLSKA_SZER_GEOGR, POLSKA_DL_GEOGR), { title: 'my', icon: markerIcon });
  markerCluster.addLayer(marker);

  marker = L.marker(new L.LatLng(POLSKA_SZER_GEOGR + 1, POLSKA_DL_GEOGR + 1), { title: 'my', icon: markerIcon });
  markerCluster.addLayer(marker);

  map2.addLayer(markerCluster);


  marker = L.marker(new L.LatLng(POLSKA_SZER_GEOGR, POLSKA_DL_GEOGR), { title: 'my', icon: markerIcon });
  markerCluster.addLayer(marker);

  marker = L.marker(new L.LatLng(POLSKA_SZER_GEOGR + 1, POLSKA_DL_GEOGR + 1), { title: 'my', icon: markerIcon });
  markerCluster.addLayer(marker);

  map2.addLayer(markerCluster);



  /*const addressPoints = [
    [POLSKA_SZER_GEOGR, POLSKA_DL_GEOGR, '1'],
    [POLSKA_SZER_GEOGR + 1, POLSKA_DL_GEOGR + 1, '1'],
  ]
*/
  //  const markers = L.markerClusterGroup();

  /*

  for (let i = 0; i < addressPoints.length; i++) {
    //if (addressPoints[i]) {      }
    let a = addressPoints[i];
    let title = a[2];
    let marker = L.marker(new L.LatLng(a[0], a[1]), {
      title: title,
      icon: markerIcon
    });
    marker.bindPopup(title);
    markers.addLayer(marker);
  }
*/
  //map2.addLayer(markers);



  // Create GeoJSON layer & add to map
  // https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service
  private initShapesLayer() {
    /*
        const shapeLayer = L.geoJSON(this.shapes, {
          style: (feature) => ({
            weight: 3,
            opacity: 0.5,
            color: '#008f68',
            fillOpacity: 0.8,
            fillColor: '#6DB65B'
          }),
          onEachFeature: (feature, layer) => (
            layer.on({
              mouseover: (e) => (this.highlightFeature(e)),
              mouseout: (e) => (this.resetFeature(e)),
            })
          )
        });

        if (this.lmap) {
          this.lmap.addLayer(shapeLayer);
        }
        shapeLayer.bringToBack();
      }

      //  attach mouseover & mouseout events to interact with each of the (state) shapes
      private highlightFeature(e: L.LeafletMouseEvent) {
        const layer = e.target;

        layer.setStyle({
          weight: 10,
          opacity: 1.0,
          color: '#DFA612',
          fillOpacity: 1.0,
          fillColor: '#FAE042'
        });
      }

      private resetFeature(e: L.LeafletMouseEvent) {
        const layer = e.target;

        layer.setStyle({
          weight: 3,
          opacity: 0.5,
          color: '#008f68',
          fillOpacity: 0.8,
          fillColor: '#6DB65B'
        });
      }
      */
  }
}



function ngAfterViewInit() {
  throw new Error('Function not implemented.');
}
/*
OLD CODE from Ranger 4.2 ===============================================

TODO: Abstract common code to here, unique to calling routine..

 initLeafletMap() {
    // https://leaflet.github.io/Leaflet.markercluster/example/marker-clustering-zoomtobounds.html
    // https://leafletjs.com/examples/layers-control/
    // TODO: This needs to get moved to actual point/marker display...
    let //p1 = L.marker([DEF_LAT, DEF_LONG]).bindPopup('Person 1 - John'),
        //p2 = L.marker([DEF_LAT-.1, DEF_LONG-.02]).bindPopup('Person 2 - Fred'),
        //p3 = L.marker([DEF_LAT+.02, DEF_LONG+.01]).bindPopup('Person 3 - Sally'),
        //p4 = L.marker([DEF_LAT+.01, DEF_LONG+.02]).bindPopup('Person 4 - Bucky'),
        //p5 = L.marker([DEF_LAT, DEF_LONG]).bindPopup('Person 5 - maryAnne'),
        //p6 = L.marker([DEF_LAT-.13, DEF_LONG-.025]).bindPopup('Person 6 - Cathy'),
        //p7 = L.marker([DEF_LAT+.022, DEF_LONG+.014]).bindPopup('Person 7 - Michael'),
        p8 = L.marker([DEF_LAT+.011, DEF_LONG+.022]).bindPopup('Person 8 - Olivia');

    //Instead of adding them directly to the map, you can do the following, using the LayerGroup class:
    let Team1 = L.layerGroup([p8]); //, p2, p3, p4]);
    let Team2 = L.layerGroup([p8]); //, p6, p7, p8]);

    let grayscale = L.tileLayer(mapboxUrl, {id: 'mapId1', attribution: mapboxAttribution});
    let streets   = L.tileLayer(mapboxUrl, {id: 'mapId2', attribution: mapboxAttribution});
    let mstreets  = L.tileLayer(mapboxUrl, {maxZoom: 16, attribution: mapboxAttribution, id: 'mapbox.streets'})
    let estreets = L.esri.basemapLayer('Streets');

    //https://leafletjs.com/reference-1.4.0.html#control-layers
    let baseMaps = {
      //"<span style='color: gray'>Grayscale</span>": grayscale,    // grayscale may no longer exist??
      //"Streets": streets
    };
    let overlayMaps = {
      "Team1": Team1,
      "Team2": Team2
    };

    bigMap   = L.map('bigLeafletMapId', {maxZoom: 20,
      layers: [estreets] // actual layers on map   //, Team1, Team2
    });
    bigMap.setView([DEF_LAT, DEF_LONG], 8);


    // Add the layer widget to the map, requires maxzoom?
    L.control.layers(baseMaps, overlayMaps).addTo(bigMap);

    //L.tileLayer(mapboxUrl, {maxZoom: 18, attribution: mapboxAttribution,id: 'mapbox.streets'}).addTo(bigMap);
  }

  initSmallMap() {
    smallMap = L.map('smallMapId' ).setView([DEF_LAT, DEF_LONG], 12);
    L.esri.basemapLayer('Streets').addTo(smallMap);

    /*
    L.tileLayer(mapboxUrl, {
      maxZoom: 18,
      attribution: mapboxAttribution,
      id: 'mapbox.streets'
    }).addTo(smallMap);
    *  /
    smallMap.setView([DEF_LAT,DEF_LONG], 12);

    smallMap.on('click', onSmallMapClick);
    // TODO: There are now 2 leaflet containers. OK?
    $('.leaflet-container').css('cursor','crosshair'); // reset cursor with ''!

    // Display coordinates if map is clicked
    let popup2 = L.popup();

    function onSmallMapClick(e) {
      popup2
        .setLatLng(e.latlng)
        .setContent(e.latlng.toString())
        .openOn(smallMap);
    }
  }

  filterLeafletMap() {
    dbug("filterLeafletMap...");
    /* Sorting:
      let points = [40, 100, 1, 5, 25, 10];
      points.sort(function(a, b){return a - b});
    * /
      let team = document.getElementById("teamFilterId").value;
      let call = document.getElementById("callFilterId").value;
      let filters = {
        Team: document.getElementById("teamFilterId").value,
        CallSign: document.getElementById("callFilterId").value,
        Minutes: document.getElementById("minuteFilterId").value,
        BaseTime: document.getElementById("baseTimeFilterId").value
      };

      dbug("Filtering on: "
        + filters.Team + " AND "
        + filters.CallSign + " AND "
        + filters.Minutes + " AND "
        + filters.BaseTime);

      filterLocations(filters);
    }
  */
