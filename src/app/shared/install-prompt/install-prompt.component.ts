import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'rangertrak-install-prompt',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './install-prompt.component.html',
  styleUrls: ['./install-prompt.component.scss']
})
export class InstallPromptComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }


}
