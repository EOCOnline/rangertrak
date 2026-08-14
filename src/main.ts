import { VERSION as CDK_VERSION } from '@angular/cdk'
import { enableProdMode, VERSION as NG_VERSION } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'

import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'
import { environment } from './environments/environment'

// NOTE: AG Grid's module registration deliberately does NOT happen here - importing
// ag-grid-community from main.ts drags the whole grid bundle into the eager initial
// chunk. See ensureAgGridRegistered() in app/shared/ag-grid-setup.ts, which the three
// lazily-loaded grid components call from their constructors instead.

if (environment.production) {
  enableProdMode();
}

/* eslint-disable no-console */
console.info('Angular version', NG_VERSION.full);
console.info('Angular CDK version', CDK_VERSION.full);

function bootstrap() {
  bootstrapApplication(AppComponent, appConfig)
    .catch(err => console.error(err))
};

if (document.readyState === 'complete') {
  bootstrap();
} else {
  document.addEventListener('DOMContentLoaded', bootstrap);
}
