ONLY GOOD FOR Test() & TEST2() showing localStorage...





// We store app settings/preferences per user & per browser into IndexedDB,
// using a wrapper modeled on the much simpler LocalStorage API

// FROM: @ngx-pwa/local-storage  angular-async-local-storage-main\projects\demo\src\app\app.components.ts
// Doc & package: https://github.com/cyrilletuzi/angular-async-local-storage
// @see doc on IndexedDB {@link https://developer.chrome.com/docs/devtools/storage/indexeddb/}

import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

import { DataService } from './data.service';
import * as F from '@angular/forms';

/*
@NgModule({
  imports: [
    // other imports ...
    ReactiveFormsModule
  ],
})
*/

interface Data {
  title: string;
}

@Component({
  selector: 'rangertrak-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
//

export class NameEditorComponent {
  name = new F.FormControl('');
  city = new F.FormControl('New York',
    [F.Validators.required,
    F.Validators.minLength(2)]);

  whoFormModel: F.FormGroup;
  whereFormModel: F.FormGroup;
  whenFormModel: F.FormGroup;
  whatFormModel: F.FormGroup;

  constructor() {
    this.whoFormModel = new F.FormGroup({
      callsign: new F.FormControl('NoCallSign!',
        [F.Validators.required,
        F.Validators.minLength(5)]),
      team: new F.FormControl('T1')
    });
    this.whereFormModel = new F.FormGroup({
      address: new F.FormControl(''),
      lat: new F.FormControl(SettingsComponent.DEF_LAT,
        [F.Validators.required,
        F.Validators.minLength(5)]),
      long: new F.FormControl(SettingsComponent.DEF_LONG,
        [F.Validators.required,
        F.Validators.minLength(5)])
    });
    this.whenFormModel = new F.FormGroup({
      date: new F.FormControl(new Date())
    });
    this.whatFormModel = new F.FormGroup({
      status: new F.FormControl(''),
      notes: new F.FormControl('')
    });
    publish: new F.FormControl('')
    reset: new F.FormControl('')
  }

  updateName() {
    this.name.setValue('Nancy');
  }

}
export class SettingsComponent implements OnInit {
  static DEF_LAT = 47.4472;
  static DEF_LONG = -122.4627; // Vashon EOC!
  static DEF_PCODE = '84VVCGWP+VW'; // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
  static locale_Name = 'Vashon, WA';
  //static defPCodeLabel = " for " + Mapz.locale_Name + " locale  Full code: "
  // Set form default
  static initLatDD = '47.4472';
  static initLngDD = '-122.4627';
  static version = '11.0.0';

  // For test2():
  mkrSize$!: Observable<number>;

  // For test():
  getItem$!: Observable<Data | null>;
  schemaError$!: Observable<string | null>;
  removeItem$!: Observable<string | null>;
  clear: string | null = 'hello world';
  size$!: Observable<number>;
  length$!: Observable<number>;
  keys$!: Observable<string[]>;
  has$!: Observable<boolean>;
  service$!: Observable<string | undefined>;

  constructor(
    private localStorage: LocalStorage,
    private storageMap: StorageMap,
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    console.log('IndexedDB test started at ', Date());

    //this.test();
    this.test2();

    console.log('IndexedDB test completed at ', Date());
  }

  Version() {
    return this.Version;
  }

  test3() {

  }

  test2() {
    // testbed

    this.localStorage
      .setItem('clear', 'testyyyyyy')
      .pipe(
        mergeMap(() => this.localStorage.clear()),
        mergeMap(() => this.localStorage.getItem('clear', { type: 'string' }))
      )
      .subscribe((result: string | null) => {
        /* Waiting for the `.clear()` to be done before other operations,
         * as all operations are asynchronous, `.clear()` could interfer with the other tests */

        this.clear = result;
        //this.localStorage.clear();
        console.log('IndexedDB Cleared at ', Date());

        this.mkrSize$ = this.localStorage.setItem('rngr_MarkerSize', '10').pipe(
          mergeMap(() => this.localStorage.setItem('rngr_MarkerSize2', '5')),
          mergeMap(() => this.localStorage.length)
        );

        this.keys$ = this.storageMap.set('rngr_MarkerColor', 'red').pipe(
          mergeMap(() => this.storageMap.keys()),
          toArray()
        );

        /*
  // Supply default value on read error:
  this.storage.get('color').pipe(
      catchError(() => of('red')),
    ).subscribe((result) => { });

    */

        this.has$ = this.localStorage
          .setItem('rngr_Team', 'TeamBlue')
          .pipe(mergeMap(() => this.storageMap.has('rngr_Team')));
      });
  }

  test() {
    // Original test code fromm Demo application. Don't alter code below, or matching code in settings.component.html
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
    };

    // Test functionality from original demo app...
    this.localStorage
      .setItem('clear', 'testyyyyyy')
      .pipe(
        mergeMap(() => this.localStorage.clear()),
        mergeMap(() => this.localStorage.getItem('clear', { type: 'string' }))
      )
      .subscribe((result: string | null) => {
        /* Waiting for the `.clear()` to be done before other operations,
         * as all operations are asynchronous, `.clear()` could interfer with the other tests */

        this.clear = result;

        this.getItem$ = this.localStorage
          .setItem('getItemTest', { title: 'hello world' })
          .pipe(
            mergeMap(() =>
              this.localStorage.getItem<Data>('getItemTest', schema)
            )
          );

        this.schemaError$ = this.localStorage
          .setItem('schemaError', { wrong: 'test' })
          .pipe(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            mergeMap(() =>
              this.localStorage.getItem('schemaError', schema as any)
            ),
            catchError(() => of('schema error'))
          );

        this.removeItem$ = this.localStorage.setItem('removeItem', 'test').pipe(
          mergeMap(() => this.localStorage.removeItem('removeItem')),
          mergeMap(() =>
            this.localStorage.getItem('removeItem', { type: 'string' })
          )
        );

        this.length$ = this.localStorage.setItem('size1', 'test').pipe(
          mergeMap(() => this.localStorage.setItem('size2', 'test')),
          mergeMap(() => this.localStorage.length)
        );

        this.keys$ = this.storageMap.set('keys', 'test').pipe(
          mergeMap(() => this.storageMap.keys()),
          toArray()
        );

        this.has$ = this.localStorage
          .setItem('has', 'test')
          .pipe(mergeMap(() => this.storageMap.has('has')));

        this.service$ = this.dataService.data$;
      });
  }
}

/*
  // Alternatives:
    https://blog.briebug.com/blog/managing-local-storage-in-angular
    https://stackblitz.com/edit/local-storage-subject-as-service-j9qe28?file=src%2Fapp%2Flocal-storage.service.ts
    https://github.com/gsklee/ngStorage
    https://wicg.github.io/kv-storage/


  // Following from: https://github.com/cyrilletuzi/angular-async-local-storage

  // Alternative to the following is in ./data.service.ts
  @Injectable()
  export class SettingsService {
    constructor(private storage: StorageMap) {}
  }

  // Write data
  let user: User = { firstName: 'Henri', lastName: 'Bergson' };
  this.storage.set('user', user).subscribe(() => {});

  // Delete data
  this.storage.delete('user').subscribe(() => {}); // Delete 1 item
  this.storage.clear().subscribe(() => {}); // Delete ALL data!!!

  // Read data (does NOT refresh if data changes)
  // See https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/WATCHING.md to watch changes
  this.storage.get('user').subscribe((user) => {
    console.log(user);
  });

  // Not finding an item is not an error, it succeeds but returns undefined:
  this.storage.get('notexisting').subscribe((data) => {
    data; // undefined
  });

  // Client side data is NOT secure: https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/VALIDATION.md
  // Use a json schema to verify the data structure
  this.storage.get('test', { type: 'string' }).subscribe({
    next: (user) => { /* Called if data is valid or `undefined` * / },
    error: (error) => { /* Called if data is invalid * / },
  });

  // NO need to unsubscribe: the Observable autocompletes (like in the Angular HttpClient service).
  // You DO need to subscribe, even if you don't have something specific to do after writing in storage (because it's how RxJS Observables work).

  // Catch potential errors
  this.storage.set('color', 'red').subscribe({
    next: () => {},
    error: (error) => {},
  });

  // Supply default value on read error:
  import { of } from 'rxjs';
  import { catchError } from 'rxjs/operators';
  this.storage.get('color').pipe(
    catchError(() => of('red')),
  ).subscribe((result) => {});

  // Possible errors:
  // https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/ERRORS.md

  // This lib also provides a Map-like API for advanced operations:
  //  .keys()
  //  .has(key)
  //  .size
  // More at: https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/MAP_OPERATIONS.md

  // Avoid collisions with other apps with prefixing:
  // https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/COLLISION.md

  // Store any value, without worrying about serializing. But storing null or undefined makes no sense and can cause issues in some browsers, so the item will be removed instead,
  //  you should stick to JSON data, ie. primitive types, arrays and literal objects. Date, Map, Set, Blob and other special structures can cause issues in some scenarios.
  // https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/SERIALIZATION.md
}
*/
