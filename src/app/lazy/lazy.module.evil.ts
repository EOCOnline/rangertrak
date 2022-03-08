import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'  // vs. BrowserModule that App imports
// import { RouterModule } from '@angular/router'

import { LazyRoutingModule } from './lazy-routing.module';
import { LazyComponent } from "./lazy.component";

import { ThreeWordsService } from './shared/services/'
import { HeaderComponent } from '../shared';
import { AboutComponent } from './about/about.component';
import { FlexLayoutModule } from '@angular/flex-layout';

// https://malcoded.com/posts/angular-fundamentals-modules/ is good
// https://angular.io/guide/build#configuring-commonjs-dependencies
// https://angular.io/guide/ngmodule-faq#what-is-the-forroot-method: singleton

@NgModule({

  // Import sub-modules
  imports: [
    CommonModule,
    LazyRoutingModule,
    FlexLayoutModule,
    HeaderComponent,
    /*
      RouterModule.forChild([
        //{path: '', component: ThreeWordsService},
        { path: 'about', component: AboutComponent }
      ])
    */
  ],

  // Define all the components, directives and pipes, that are declared and used inside this module.
  // If you want to use any of these in multiple modules, bundle it into a separate module & import that in the module
  declarations: [
    AboutComponent,
    LazyComponent,
    //, ThreeWordsService
    HeaderComponent
  ],

  // Define any required @Injectables. Any sub-components or modules can get the same @Injectable instance via dependency injection.
  // In the case of the AppModule, these @Injectables are application-scoped
  //
  //providers: [
  //ThreeWordsService
  //],

  // Make components, directives or pipes available to other modules...
  exports: [
    //ThreeWordsService,
    AboutComponent
  ]
})

export class LazyModule { }
