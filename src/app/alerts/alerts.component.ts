import { Component, OnInit } from '@angular/core';

import {MatFormFieldModule} from '@angular/material/form-field';

@Component({
  selector: 'rangertrak-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})

export class AlertsComponent implements OnInit {
  isAlertHidden: boolean


  constructor() {
    this.isAlertHidden = false;
  }

  ngOnInit(): void {
  }

  onClickEvent() {
    this.isAlertHidden = true;
  }
}


