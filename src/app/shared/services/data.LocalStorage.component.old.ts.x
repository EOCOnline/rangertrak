import { Component, OnInit } from '@angular/core';
import { Injectable } from '@angular/core';
import { StorageMap } from '@ngx-pwa/local-storage';


@Component({
  selector: 'rangertrak-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

export class SettingsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  @Injectable()
export class SettingsService {
  constructor(private storage: StorageMap) {}
}

  let user: User = { firstName: 'Henri', lastName: 'Bergson' };
  this.storage.set('user', user).subscribe(() => {});



  this.storage.delete('user').subscribe(() => {}); // Delete 1 item
  this.storage.clear().subscribe(() => {}); // Delete ALL data!!!



  this.storage.get('user').subscribe((user) => {
    console.log(user);
  });  // get the current value; https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/WATCHING.md to get updates on data change

  this.storage.get('notexisting').subscribe((data) => {  // Not finding an item is not an error, it succeeds but returns undefined:
    data; // undefined
  });

  // Data could always be forged. Details: https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/VALIDATION.md
  // Easy option is to verify data fits a json schema:
  this.storage.get('test', { type: 'string' }).subscribe({
    next: (user) => { /* Called if data is valid or `undefined` */ },
    error: (error) => { /* Called if data is invalid */ },
  });

  // To supply default value on read error:
  //https://github.com/cyrilletuzi/angular-async-local-storage#errors
  import { of } from 'rxjs';
  import { catchError } from 'rxjs/operators';

  this.storage.get('color').pipe(
    catchError(() => of('red')),
  ).subscribe((result) => {});



}

/*
class StorageMap {
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
}
*/

/* https://github.com/cyrilletuzi/angular-async-local-storage#writing-data
You can store any value, without worrying about serializing. But note that:

    storing null or undefined makes no sense and can cause issues in some browsers, so the item will be removed instead,
    you should stick to JSON data, ie. primitive types, arrays and literal objects. Date, Map, Set, Blob and other special structures can cause issues in some scenarios. See the serialization guide for more details.
* /
let user: User = { firstName: 'Henri', lastName: 'Bergson' };
this.storage.set('user', user).subscribe(() => {});



this.storage.delete('user').subscribe(() => {}); // Delete 1 item
this.storage.clear().subscribe(() => {}); // Delete ALL data!!!



this.storage.get('user').subscribe((user) => {
  console.log(user);
});  // get the current value; https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/WATCHING.md to get updates on data change

this.storage.get('notexisting').subscribe((data) => {  // Not finding an item is not an error, it succeeds but returns undefined:
  data; // undefined
});

// Data could always be forged. Details: https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/VALIDATION.md
// Easy option is to verify data fits a json schema:
this.storage.get('test', { type: 'string' }).subscribe({
  next: (user) => { /* Called if data is valid or `undefined` * / },
  error: (error) => { /* Called if data is invalid * / },
});

// To supply default value on read error:
//https://github.com/cyrilletuzi/angular-async-local-storage#errors
import { Observable,debounceTime, map, startWith } from 'rxjs'
//import { debounceTime, map, startWith } from 'rxjs/operators'

this.storage.get('color').pipe(
  catchError(() => of('red')),
).subscribe((result) => {});



/*
https://blog.briebug.com/blog/managing-local-storage-in-angular
https://stackblitz.com/edit/local-storage-subject-as-service-j9qe28?file=src%2Fapp%2Flocal-storage.service.ts

https://github.com/gsklee/ngStorage
https://github.com/cyrilletuzi/angular-async-local-storage - implemented with IndexedDB!
Install got: An unhandled exception occurred: NOT SUPPORTED: keyword "id", use "$id" for schema ID
See "C:\Users\John\AppData\Local\Temp\ng-IFEKZ1\angular-errors.log" for further details.


[error] Error: NOT SUPPORTED: keyword "id", use "$id" for schema ID
    at Object.code (D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\vocabularies\core\id.js:6:15)
    at keywordCode (D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\validate\index.js:454:13)
    at D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\validate\index.js:222:17
    at CodeGen.code (D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\codegen\index.js:439:13)
    at CodeGen.block (D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\codegen\index.js:568:18)
    at iterateKeywords (D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\validate\index.js:219:9)
    at groupKeywords (D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\validate\index.js:208:13)
    at D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\validate\index.js:192:13
    at CodeGen.code (D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\codegen\index.js:439:13)
    at CodeGen.block (D:\Projects\RangerTrak\rangertrak\node_modules\ajv\dist\compile\codegen\index.js:568:18)


    https://wicg.github.io/kv-storage/


The Local Storage API has 4 methods:
1. setItem(key: string, data: string | JSON): void
    Takes a key parameter and a value parameter. The key allows you to retrieve the value later using lookups. The value is stored as a JSON string. This method does not return anything.
2. getItem(key: string): string | JSON | null
    Takes a key parameter for looking up data in storage. If this lookup fails it will return a null value.
3. removeItem(key: string): undefined
    Takes a key parameter for looking up data in storage. This method always returns undefined.
4. clear(): undefined
    Takes no parameters. Clears all data in local storage. This method always returns undefined.

setData(data) {
   const jsonData = JSON.stringify(data)
   localStorage.setItem('myData', jsonData)
}

getData() {
   return localStorage.getItem('myData')
}

removeData(key) {
   localStorage.removeItem(key)
}

*/
