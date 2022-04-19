//import './polyfills';

import { VERSION as CDK_VERSION } from '@angular/cdk';
import { VERSION as MAT_VERSION } from '@angular/material/core';

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

/* eslint-disable no-console */
console.info('Angular CDK version', CDK_VERSION.full);
console.info('Angular Material version', MAT_VERSION.full);

// Load root module using bootstrap from platformBrowserDynamic
// (ng.core only has platform neutral stuff & uses AOT compilation)
platformBrowserDynamic() // JIT compilation/execution of ng apps for browsers
  .bootstrapModule(AppModule)
  /*  Found in StackBlitz samples... doesn't resolve 'ngRef'
    .then(ref => {
      Ensure Angular destroys itself on hot reloads.
      if (window[<any>"ngRef"]) {
        window[<any>"ngRef"].destroy();
      }
      window[<any>"ngRef"] = ref;
    })
    */
  .catch(err => console.error(err)) //log any boot errors
