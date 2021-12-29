import { RouterModule, Routes } from '@angular/router';

import { AboutComponent } from './about/about.component';
import { NgModule } from '@angular/core';

//import { BlogDetailsComponent } from '../blog-details/blog-details.component';

const routes: Routes = [
  { path: 'about', component: AboutComponent },
  //{ path: 'blog-details', component: BlogDetailsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class LazyRoutingModule { }
