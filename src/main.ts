import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'

import { VERSION as CDK_VERSION } from '@angular/cdk'
import { enableProdMode, VERSION as NG_VERSION } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'

import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'
import { environment } from './environments/environment'

// AG Grid v33+ ships nothing by default: every feature lives in a module that has to be
// registered up front, or each <ag-grid-angular> renders an empty shell and logs error
// #272. Registering once here covers all three grids (Rangers, Field Reports, Settings).
// The grids still use the classic CSS themes (ag-theme-alpine/balham, imported in
// styles.scss), which v33+ calls "legacy" - each grid opts into that via `theme:
// 'legacy'` in its gridOptions, otherwise the newer Theming API also applies its own
// styles and the two fight (error #239).
ModuleRegistry.registerModules([AllCommunityModule])

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
