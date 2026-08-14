// This file is required by karma.conf.js and loads recursively all the .spec and framework files

// zone.js/testing is an add-on to base zone.js, not a replacement for it - it
// expects the global `Zone` to already exist. The app itself is zoneless
// (see polyfills.ts), so that base import can no longer come from there;
// TestBed's synchronous fixture.detectChanges()-based testing model still
// needs it, so both imports live here instead.
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
