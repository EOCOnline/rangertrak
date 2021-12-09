import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

//import { OriginFieldReport } from './field-report';

@Injectable({  providedIn: 'root' })

export enum Source {
  Voice,
  Packet,
  APRS,
  Email
}
export class TeamService{


  teams = [
    { name: "T1", icon: "T1.png", color: 'Magenta', fillColor: 'grey', shape: this.shapes[1], note: "" },
    { name: "T2", icon: "T2.png", color: 'Green', fillColor: 'blue', shape: this.shapes[2], note: "" },
    { name: "T3", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T4", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T5", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T6", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T7", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T8", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T9", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T10", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T11", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T12", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T13", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T14", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T15", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T16", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T17", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T18", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T19", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T20", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T21", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "Other", icon: "Other.png", color: 'Yellow', fillColor: '#f03', shape: this.shapes[2], note: "" }
  ];

  getTeams() {
    return this.teams;
  }
}

@Injectable({  providedIn: 'root' })
export class Team {

  static nextId = 1;
  id: Number;
  date: Date;
  callSign: string;
  licensee: string;


  columns = [
    { field: "name" },
    { field: "icon" },
    { field: "color" },
    { field: "fillColor" },
    { field: "shape", cellEditor: 'agSelectCellEditor', cellEditorParams: { values: this.shapes } },
    { field: "note" }
  ];

  //icons: <fa-icon [icon]="faMapMarkedAlt"></fa-icon>

  // Marker uses icons; Circle uses color + fillColor; Note is for user's notes
  teams = [
    { name: "T1", icon: "T1.png", color: 'Magenta', fillColor: 'grey', shape: this.shapes[1], note: "" },
    { name: "T2", icon: "T2.png", color: 'Green', fillColor: 'blue', shape: this.shapes[2], note: "" },
    { name: "T3", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T4", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T5", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T6", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T7", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T8", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T9", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T10", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T11", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T12", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T13", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T14", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T15", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T16", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T17", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T18", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T19", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T20", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T21", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "Other", icon: "Other.png", color: 'Yellow', fillColor: '#f03', shape: this.shapes[2], note: "" }
  ];

  constructor (callSign: string, name: string, licensee: string, team: string, licenseKey: string, phone: string, email: string, icon: string, note: string)
    {
      this.id = Team.nextId++; // TODO: OK if user restarts app during SAME mission #?
      this.date = new Date();
      this.callSign = callSign;
      this.licensee = licensee;

      // add validation code here?! or in forms code?
    }

    //edit () {   }    TODO: wise to provide this option?!

    toString():string {
      return "Team ID:" + this.id +
        "; call: " + this.callSign +
        "; licensee: " + this.licensee +
        ";; "
    }


    addTeamRow(): void {
      this.teams.push({ name: "new Team", icon: "Other.png", color: 'white', fillColor: '#f03', shape: this.shapes[1], note: "" })
    }

    models = ['Mercedes-AMG C63', 'BMW M2', 'Audi TT Roadster', 'Mazda MX-5', 'BMW M3', 'Porsche 718 Boxster', 'Porsche 718 Cayman',];
    colors = ['Red', 'Black', 'Green', 'White', 'Blue'];
    countries = ['UK', 'Spain', 'France', 'Ireland', 'USA'];

    createRowData() {
      var rowData = [];
      for (var i = 0; i < 200; i++) {
        var item = {
          model: this.models[Math.floor(Math.random() * this.models.length)],
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          country: this.countries[Math.floor(Math.random() * this.countries.length)],
          year: 2018 - Math.floor(Math.random() * 20),
          price: 20000 + Math.floor(Math.random() * 100) * 100,
        };
        rowData.push(item);
      }
      return rowData;
    }

    setQuickFilter(): void {
      //TODO: Not implemented!
      // Expects parameter: newFilter: any
    }

    /*
      gridOptions = {
        columns: [
          { field: 'firstName' },
          { field: 'lastName' },
          { field: 'gender' },
          { field: 'age' },
          { field: 'mood' },
          { field: 'country' },
          { field: 'address', minWidth: 550 },
        ],
        defaultColDef: {
          flex: 1,
          minWidth: 110,
          editable: true,
          resizable: true,
        },
        rowData: this.teams,
        pinnedTopRowData: getPinnedTopData(),
        pinnedBottomRowData: getPinnedBottomData(),
        onRowEditingStarted: function (event) {
          console.log('never called - not doing row editing');
        },
        onRowEditingStopped: function (event) {
          console.log('never called - not doing row editing');
        },
        onCellEditingStarted: function (event) {
          console.log('cellEditingStarted');
        },
        onCellEditingStopped: function (event) {
          console.log('cellEditingStopped');
        },
      };
    */









  // TODO: Inject another sunb-service to handle the following!!!

    // Save to disk or ...
    serialize(name: string) {
      ;
    }

    load(name: string) {
      ;
    }

  }
