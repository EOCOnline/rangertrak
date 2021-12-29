import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class PostService {

  constructor(private http: HttpClient) { }

  opts = [];

  getData() {
    // Free fake API for testing and prototyping: https://jsonplaceholder.typicode.com/
    return this.opts.length ?
      of(this.opts) :
      this.http.get('https://jsonplaceholder.typicode.com/users').pipe(tap(data => this.opts = data))
  }

  fwefwe
}
