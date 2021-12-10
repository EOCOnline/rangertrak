import { Injectable } from '@angular/core';

@Injectable() //  {providedIn: 'root'} )
export class ThreeWordsService {

  //constructor() { }

  get3Words() {
    return "///verse.moving.miles"
  }
}
