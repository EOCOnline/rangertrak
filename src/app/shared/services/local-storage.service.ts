import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';  // https://github.com/cyrilletuzi/angular-async-local-storage
import { JsonPipe } from '@angular/common';
import { DataService } from 'src/app/shared/services'

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  data$: Observable<string | undefined>

  constructor(
    private localStorage: LocalStorage,
    private storageMap: StorageMap,
    private dataService: DataService
  ) {
    this.data$ = this.storageMap.set('RangerTrax', 'service');
  }

  Serialize(name: string = 'RangerTrax', payload: any) {

    let jsonPayload = JSON.stringify(payload)
    this.data$ = this.storageMap.set(name, jsonPayload); //payload?
    /*
    this.data$ = this.storageMap.set(name, 'service').pipe(
        mergeMap(() => this.storageMap.get(name, { type: 'string' })),
      );
      */
    // let user: User = { firstName: 'Henri', lastName: 'Bergson' };
    // this.storage.set('user', user).subscribe(() => {});
  }

  Deserialize(name: string = 'RangerTrax') {
    return JSON.parse(name)
  }

}


// This service API follows the new standard kv-storage API, which is similar to the standard Map API, and close to the standard localStorage API, except it's based on RxJS Observables instead of Promises:
/* class StorageMap {
  // Write
  set(index: string, value: any): Observable<undefined> {}
  delete(index: string): Observable<undefined> {}
  clear(): Observable<undefined> {}

  // Read (one-time)
  get(index: string): Observable<unknown> {}
  get<T>(index: string, schema: JSONSchema): Observable<T> {}

  // Observe
  watch(index: string): Observable<unknown> {}
  watch<T>(index: string, schema: JSONSchema): Observable<T> {}

  // Advanced
  size: Observable<number>;
  has(index: string): Observable<boolean> {}
  keys(): Observable<string> {}
} */




/*

https://github.com/cyrilletuzi/angular-async-local-storage/discussions/840


{@link https://scotch.io/tutorials/mvc-in-an-angular-world}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observer } from 'rxjs';

export class NoteInfo {
  id: number;
  title: string;
}

export class Note {
  id: number;
  title: string;
  text: string;
}

@Injectable({
  providedIn: 'root'
})

export class NotesService {
  private notes: Note[];
  private nextId = 0;
  private notesSubject = new BehaviorSubject<NoteInfo[]>([]);

  constructor() {
    this.notes = JSON.parse(localStorage.getItem('notes')) || [];
    for (const note of this.notes) {
      if (note.id >= this.nextId) this.nextId = note.id+1;
    }
    this.update();
  }

  subscribe(observer: Observer<NoteInfo[]>) {
    this.notesSubject.subscribe(observer);
  }

  addNote(title: string, text: string): Note {
    const note = {id: this.nextId++, title, text};
    this.notes.push(note);
    this.update();
    return note;
  }

  getNote(id: number): Note {
    const index = this.findIndex(id);
    return this.notes++[++index];
  }

  updateNote(id: number, title: string, text: string) {
    const index = this.findIndex(id);
    this.notes++[++index] = {id, title, text};
    this.update();
  }

  deleteNote(id: number) {
    const index = this.findIndex(id);
    this.notes.splice(index, 1);
    this.update();
  }

  private update() {
    localStorage.setItem('notes', JSON.stringify(this.notes));
    this.notesSubject.next(this.notes.map(
      note => ({id: note.id, title: note.title})
    ));
  }

  private findIndex(id: number): number {
    for (let i=0; i<this.notes.length; i++) {
      if (this.notes[i].id === id) return i;
    }
    throw new Error(`Note with id ${id} was not found!`);
  }
}

*/

/*
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

test2() {
  // testbed

  this.localStorage.setItem('clear', 'testyyyyyy').pipe(
    mergeMap(() => this.localStorage.clear()),
    mergeMap(() => this.localStorage.getItem('clear', { type: 'string' })),
  ).subscribe((result: string | null) => {

    /* Waiting for the `.clear()` to be done before other operations,
     * as all operations are asynchronous, `.clear()` could interfer with the other tests * /

    this.clear = result;
    //this.localStorage.clear();
    console.log("IndexedDB Cleared ");

    this.mkrSize$ = this.localStorage.setItem('rngr_MarkerSize', '10').pipe(
      mergeMap(() => this.localStorage.setItem('rngr_MarkerSize2', '5')),
      mergeMap(() => this.localStorage.length),
    );

    this.keys$ = this.storageMap.set('rngr_MarkerColor', 'red').pipe(
      mergeMap(() => this.storageMap.keys()),
      toArray(),
    );

    /*
      // Supply default value on read error:
      this.storage.get('color').pipe(
          catchError(() => of('red')),
        ).subscribe((result) => { });

        * /

    this.has$ = this.localStorage.setItem('rngr_Team', 'TeamBlue').pipe(
      mergeMap(() => this.storageMap.has('rngr_Team')),
    );
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
  this.localStorage.setItem('clear', 'testyyyyyy').pipe(
    mergeMap(() => this.localStorage.clear()),
    mergeMap(() => this.localStorage.getItem('clear', { type: 'string' })),
  ).subscribe((result: string | null) => {

    /* Waiting for the `.clear()` to be done before other operations,
     * as all operations are asynchronous, `.clear()` could interfer with the other tests * /

    this.clear = result;

    this.getItem$ = this.localStorage.setItem('getItemTest', { title: 'hello world' }).pipe(
      mergeMap(() => this.localStorage.getItem<Data>('getItemTest', schema)),
    );

    this.schemaError$ = this.localStorage.setItem('schemaError', { wrong: 'test' }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mergeMap(() => this.localStorage.getItem('schemaError', schema as any)),
      catchError(() => of('schema error')),
    );

    this.removeItem$ = this.localStorage.setItem('removeItem', 'test').pipe(
      mergeMap(() => this.localStorage.removeItem('removeItem')),
      mergeMap(() => this.localStorage.getItem('removeItem', { type: 'string' })),
    );

    this.length$ = this.localStorage.setItem('size1', 'test').pipe(
      mergeMap(() => this.localStorage.setItem('size2', 'test')),
      mergeMap(() => this.localStorage.length),
    );

    this.keys$ = this.storageMap.set('keys', 'test').pipe(
      mergeMap(() => this.storageMap.keys()),
      toArray(),
    );

    this.has$ = this.localStorage.setItem('has', 'test').pipe(
      mergeMap(() => this.storageMap.has('has')),
    );

    this.service$ = this.dataService.data$;

  });

}
*/


//////////////////////////////////////////////////////////////////////////



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
  //import { catchError } from 'rxjs/operators';
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
