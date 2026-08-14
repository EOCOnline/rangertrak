import { ApplicationConfig, isDevMode, provideZonelessChangeDetection } from '@angular/core'
import { provideAnimations } from '@angular/platform-browser/animations'
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { provideServiceWorker } from '@angular/service-worker'
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar'

import { APP_ROUTES } from './app.routes'
import { environment } from '../environments/environment'
import {
  GEOCODING_PROVIDER, GeocodingProvider, GoogleGeocoder, NominatimGeocoder
} from './shared'
import { SettingsService } from './shared/services'

// Standalone replacement for AppModule's NgModule imports/providers.
// AgGridModule is NOT here: every component that actually uses it already
// imports it directly (verified via grep), and for standalone components a
// parent NgModule import does nothing for template/directive resolution -
// only providers/module side-effects (registered here) matter at this level.
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
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
      // Nominatim by default (no key). Switches to Google only if the user has
      // supplied their own key in Settings (see Decision 1, PRIVATE-Roadmap.md). Read once
      // at app boot - changing the key in Settings takes effect on next reload.
      provide: GEOCODING_PROVIDER,
      useFactory: (settingsService: SettingsService): GeocodingProvider => {
        const apiKey = settingsService.settings.googleGeocodingApiKey
        return apiKey ? new GoogleGeocoder(apiKey) : new NominatimGeocoder()
      },
      deps: [SettingsService]
    }
  ]
}
