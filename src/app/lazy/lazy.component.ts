import { Component, ChangeDetectionStrategy } from '@angular/core'

@Component({
  selector: 'lazy',

  template: '',   // templateUrl: [], // './lazy.component.html'
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: [] //./lazy.component.scss
})
export class LazyComponent {
  title = 'rangertrak LAZY'
  pageDescr = `Display of rangers' positions and status throughout a mission`
}
