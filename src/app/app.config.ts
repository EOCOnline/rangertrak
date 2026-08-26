import { ApplicationConfig, ErrorHandler, isDevMode, provideZonelessChangeDetection } from '@angular/core'
import { provideAnimations } from '@angular/platform-browser/animations'
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { provideServiceWorker } from '@angular/service-worker'
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar'
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field'

import { APP_ROUTES } from './app.routes'
import { environment } from '../environments/environment'
// Imported from their own files rather than the './shared' barrel on purpose. That barrel
// also re-exports AbstractMap and the MapLibre style helpers, so importing anything
// through it here - in the eagerly-loaded app config - drags Leaflet and MapLibre into the
// initial bundle and undoes the route-level code splitting in app.routes.ts. Leaflet is
// CommonJS, which blocks the tree-shaking that would otherwise save us.
import {
  GEOCODING_PROVIDER, GeocodingProvider
} from './shared/mapping/geocoding-provider.interface'
import { GoogleGeocoder } from './shared/mapping/google-geocoder'
import { NominatimGeocoder } from './shared/mapping/nominatim-geocoder'
import { GlobalErrorHandler, MissionService } from './shared/services'

// Standalone replacement for AppModule's NgModule imports/providers.
// AgGridModule is NOT here: every component that actually uses it already
// imports it directly (verified via grep), and for standalone components a
// parent NgModule import does nothing for template/directive resolution -
// only providers/module side-effects (registered here) matter at this level.
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    // Sends uncaught exceptions and rejected promises to the in-app Log page, which a
    // field user can actually see - see global-error-handler.ts.
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(),
    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production || !isDevMode(),
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } },
    {
      // ONE line that restyles every text field in the app, which is the point: the
      // Material-M3 pass (2026-08-25) decided against per-component field styling, so the
      // appearance is set once here rather than repeated as an `appearance="..."` attribute
      // on each `<mat-form-field>` - and, crucially, so fields converted FROM bare `<input>`
      // markup (the whole Mission page) inherit it without any attribute at all.
      //
      // `outline` over `fill`: M3's outlined field draws its own border and notches the
      // label into it, which reads correctly on this app's tinted `--rt-surface-2` section
      // backgrounds. `fill` supplies its own tinted box, which double-tints against those
      // and was one of the things E-47 already removed by hand once.
      //
      // `subscriptSizing: 'dynamic'` stops each field reserving a permanent ~20px row for a
      // hint/error it usually doesn't show. On a page like Mission - dozens of fields, most
      // with no hint - that reserved space was pure vertical bloat. It expands only when a
      // field actually has something to say.
      //
      // Note time-picker.component.html already sets `appearance="outline"` explicitly and
      // then hides the outline via ::ng-deep (see its .scss) - an explicit attribute still
      // wins over this default, so that widget is unaffected.
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' }
    },
    {
      // Nominatim by default (no key). Switches to Google only if the user has
      // supplied their own key in Settings (see Decision 1, PRIVATE-Roadmap.md). Read once
      // at app boot - changing the key in Settings takes effect on next reload.
      provide: GEOCODING_PROVIDER,
      useFactory: (missionService: MissionService): GeocodingProvider => {
        const apiKey = missionService.settings.googleGeocodingApiKey
        return apiKey ? new GoogleGeocoder(apiKey) : new NominatimGeocoder()
      },
      deps: [MissionService]
    }
  ]
}
