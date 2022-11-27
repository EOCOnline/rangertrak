//import './polyfills';

//import { initializeApp } from 'firebase/app'

import { VERSION as CDK_VERSION } from '@angular/cdk'
import { enableProdMode } from '@angular/core'
import { VERSION as MAT_VERSION } from '@angular/material/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

import { AppModule } from './app/app.module'
import { environment } from './environments/environment'

if (environment.production) {
  enableProdMode();
}

/* eslint-disable no-console */
console.info('Angular CDK version', CDK_VERSION.full);
console.info('Angular Material version', MAT_VERSION.full);

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

/*
// Your web app's Firebase configuration
const firebaseConfig = {
apiKey: "AIzaSyAEppXv1x4PO7JuRu332GQTizl3ZCpNu-M",
authDomain: "rangertrak-a6dc5.firebaseapp.com",
projectId: "rangertrak-a6dc5",
storageBucket: "rangertrak-a6dc5.appspot.com",
messagingSenderId: "992529254565",
appId: "1:992529254565:web:d6ecabc7234254569f654c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
*/
