
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service

@Injectable({providedIn: 'root'})
export class ShapeService {

    constructor(private http: HttpClient) { }

    getShapeShapes(file:string) {
      return this.http.get(file);
    }
  }

