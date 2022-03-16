import * as L from 'leaflet';

import { HttpClient } from '@angular/common/http';
import { Injectable, Optional, SkipSelf } from '@angular/core';
import { PopupService } from './popup.service';
import { throwError } from 'rxjs';

export type MarkerType = {
  lat: number,
  lng: number,
  label: string,
  draggable: boolean
}

@Injectable({ providedIn: 'root' })
export class MarkerService {
  stations: string = '/assets/data/VashonFireStations.geojson';

  constructor(
    private http: HttpClient,
    private popupService: PopupService
    @Optional() @SkipSelf() existingService: MarkerService,
  ) {
    if (existingService) {
      /**
       * see https://angular.io/guide/singleton-services
       * Use @Optional() @SkipSelf() in singleton constructors to ensure
       * future modules don't provide extra copies of this singleton service
       * per pg 84 of Angular Cookbook: do NOT add services to *.module.ts!
       */
      throwError(() => {
        console.error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
        new Error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
      })
    }
  }

  static scaledRadius(val: number, maxVal: number): number {
    return 20 * (val / maxVal);
  }

  makeStationMarkers(map: L.Map): void {
    this.http.get(this.stations).subscribe((res: any) => {
      for (const c of res.features) {
        const lat = c.geometry.coordinates[0];
        const lon = c.geometry.coordinates[1];
        const marker = L.marker([lat, lon]);

        marker.addTo(map);
      }
    });
  }

  makeCapitalCircleMarkers(map: L.Map): void {
    this.http.get(this.stations).subscribe((res: any) => {

      const maxPop = Math.max(...res.features.map((x: { properties: { population: number; }; }) => x.properties.population), 0);

      for (const c of res.features) {
        const lat = c.geometry.coordinates[0];
        const lon = c.geometry.coordinates[1];
        const circle = L.circleMarker([lat, lon], {
          radius: MarkerService.scaledRadius(c.properties.population, maxPop)
        });

        circle.bindPopup(this.popupService.makeStationPopup(c.properties));

        circle.addTo(map);
      }
    });
  }

  labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  generateFakeMarkerData(markers: MarkerType[], num: number = 15) {
    console.log("Generating " + num + " more rows of FAKE field reports!")
    for (let i = 0; i < num; i++) {
      markers.push(
        {
          lat: 45 + Math.floor(Math.random() * 2000) / 1000,
          lng: -121 + Math.floor(Math.random() * 1000) / 1000,
          label: this.labels[Math.floor(Math.random() * this.labels.length)],
          draggable: true
        }
      )
    }
    //console.log("Pushed # " + numberPushed++)
  }
}
