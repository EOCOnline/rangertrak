import { ApplicationConfig, isDevMode } from '@angular/core'
import { provideAnimations } from '@angular/platform-browser/animations'
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { provideServiceWorker } from '@angular/service-worker'
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar'

import { APP_ROUTES } from './app.routes'
import { environment } from '../environments/environment'

// Standalone replacement for AppModule's NgModule imports/providers.
// GoogleMapsModule and AgGridModule are NOT here: every component that
// actually uses them already imports them directly (verified via grep),
// and for standalone components a parent NgModule import does nothing for
// template/directive resolution - only providers/module side-effects
// (registered here) matter at this level.
export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production || !isDevMode(),
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } }
  ]
}
