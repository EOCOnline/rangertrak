import { CommonModule } from '@angular/common' // vs. BrowserModule that App imports
import { NgModule } from '@angular/core'

//import { HeaderComponent } from '../shared';
import { AboutComponent } from './about/about.component'
// import { RouterModule } from '@angular/router'
import { LazyRoutingModule } from './lazy-routing.module'
import { LazyComponent } from './lazy.component'

// https://malcoded.com/posts/angular-fundamentals-modules/ is good
// https://angular.io/guide/build#configuring-commonjs-dependencies
// https://angular.io/guide/ngmodule-faq#what-is-the-forroot-method: singleton
// https://angular.io/guide/singleton-services

@NgModule({

  // Import sub-modules
  imports: [
    CommonModule,
    LazyRoutingModule,
    // Import standalone components
    AboutComponent,
    LazyComponent
    /*
      RouterModule.forChild([
        { path: 'about', component: AboutComponent }
      ])
    */
  ],

  // Define all the components, directives and pipes, that are declared and used inside this module.
  // If you want to use any of these in multiple modules, bundle it into a separate module & import that in the module
  declarations: [
    // All components are now standalone
  ],

  // Post Angular 6, singleton services don't go here: https://angular.io/guide/singleton-services
  //providers: [
  //],

  // Make components, directives or pipes available to other modules...
  exports: [
    AboutComponent,
    LazyComponent
  ]
})

export class LazyModule { }
