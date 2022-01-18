
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'  // vs. BrowserModule that App imports
// import { RouterModule } from '@angular/router'

import { LazyRoutingModule } from './lazy-routing.module';
import {LazyComponent} from "./lazy.component";

import { ThreeWordsService } from './shared/services/'
import { AboutComponent } from './about/about.component';

@NgModule({
  declarations: [
    AboutComponent,
    LazyComponent
    //, ThreeWordsService
  ],
  imports: [
    CommonModule,
    LazyRoutingModule
    /*
      RouterModule.forChild([
        //{path: '', component: ThreeWordsService},
        { path: 'about', component: AboutComponent }
      ])
    */
  ],
  providers: [ThreeWordsService],
  exports: [
    //ThreeWordsService,
    AboutComponent
  ]
})


export class LazyModule { }
