import { Routes } from '@angular/router'

import { AboutComponent } from './about/about.component'

export const LAZY_ROUTES: Routes = [
  { path: '', component: AboutComponent },
]
