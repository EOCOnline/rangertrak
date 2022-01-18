import { Injectable } from '@angular/core';
import { Observable,debounceTime, map, startWith } from 'rxjs'

import { StorageMap } from '@ngx-pwa/local-storage';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  data$: Observable<string | undefined>;

  constructor(private storageMap: StorageMap) {
    this.data$ = this.storageMap.set('rangerSettings', 'service');
    /*
    this.data$ = this.storageMap.set('rangerSettings', 'service').pipe(
        mergeMap(() => this.storageMap.get('rangerSettings', { type: 'string' })),
      );
      */
  }

}
