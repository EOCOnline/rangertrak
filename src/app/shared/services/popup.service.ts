
import { Injectable, Optional, SkipSelf } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PopupService {

  constructor(
    @Optional() @SkipSelf() existingService: PopupService,
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

  makeStationPopup(data: any): string {
    return `` +
      `<div>Station: ${data.name}</div>` +
      `<div>Address: ${data.address}</div>` +
      `<div>Population: ${data.population}</div>`
  }
}

