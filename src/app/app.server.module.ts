import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
//import { mocks } from 'mock-browser';
import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { Routes, RouterModule } from '@angular/router';
import { AppShellComponent } from './app-shell/app-shell.component';

const routes: Routes = [{ path: 'shell', component: AppShellComponent }];

const MockBrowser = require('mock-browser').mocks.MockBrowser;
const mock = new MockBrowser()

//const mock2 = new mocks.MockBrowser()
global.window = mock.getWindow();

@NgModule({
  imports: [
    AppModule,
    ServerModule,
    RouterModule.forRoot(routes),
  ],
  bootstrap: [AppComponent],
  declarations: [
    AppShellComponent
  ],
})
export class AppServerModule {

  // https://www.thecodehubs.com/how-to-solve-window-is-not-defined-in-angular-11/
  // https://www.demo2s.com/node.js/node-js-mock-browser-mockbrowser-getwindow.html
  // https://github.com/darrylwest/mock-browser
  /*
  readonly MockBrowser = require('mock-browser').mocks.MockBrowser;
  readonly mock2 = new this.MockBrowser();
 global: any['window'] = this.mock2.getWindow();
  */

  //global: any['window'] = mock.getWindow();
  //  global.window = mock.getWindow();

}

