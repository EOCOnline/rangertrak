//import './polyfills';

//import { initializeApp } from 'firebase/app'

import { VERSION as CDK_VERSION } from '@angular/cdk'
import { enableProdMode, VERSION as NG_VERSION } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

import { AppModule } from './app/app.module'
import { environment } from './environments/environment'

if (environment.production) {
  enableProdMode();
}

/* eslint-disable no-console */
console.info('Angular version', NG_VERSION.full);
console.info('Angular CDK version', CDK_VERSION.full);

// Load root module using bootstrap from platformBrowserDynamic
// (ng.core only has platform neutral stuff & uses AOT compilation)
function bootstrap() {
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
    .catch(err => console.error(err))
};


if (document.readyState === 'complete') {
  bootstrap();
} else {
  document.addEventListener('DOMContentLoaded', bootstrap);
}
//log any boot errors
