[![SWUbanner](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner2-direct.svg)](https://vshymanskyy.github.io/StandWithUkraine)

# Rangertrak

This application aids tracking & mapping CERT, ACS, other teams, rangers & individuals roaming around, who are only reliably connected via HAM radio or other non-data supporting means. They can radio in their locations - in a variety of formats, and be centrally tracked..

Track &amp; map search &amp; rescue members reporting in verbally, without internet or cell access

This is a disconnected browser based app for tracking & mapping CERT, ACS, other teams, rangers & individuals roaming around, who are only reliably connected via HAM radio or other non-data supporting means. They can radio in their locations - using a variety of location codes, and be centrally tracked.

There are a number of ways to geocode a latitude & longitude. See <https://en.wikipedia.org/wiki/Open_Location_Code#Other_geocode_systems> for a list.

## Features

- Progressive Web App (PWA) this should be able to function (in the future, possibly with some degredation) even if the person using this is offline.
- Versions after 0.0.10 are generated with Angular, so will run on most modern web browsers, regardless of device/form factor
- Open Source: free & available to enhance
- Supports recording locatinos as: lat/long, or What3Words, Google +Codes, or physical Street Addresses
- Auto-lookup of Ham Radio operators by callsign
- Google or Leaflet/ESRI maps
- Rangers can be in Teams; both are easily edited/sorted/filters
- Documented using [https://compodoc.app/guides/jsdoc-tags.html]Compodoc

## Future Roadmap

- To work with out flaws!
- Save and reload data to local files
- Allow loading of additinoal layers (e.g., an image of trails, local features),
  perhaps with <https://github.com/publiclab/Leaflet.DistortableImage>
- improved docs: screenshots and architectural diagrams
- consider <https://github.com/EventEmitter2/EventEmitter2> for multi-threaded msgs with service workers

## Items (still) requiring online access

- GeoCoding an address
- All maps (for now)
- 3Word functionality (for now)

## To Run

- (The Vision:) Simply visit <https://www.RangerTrak.org> once and the 2nd time you visit you will be given an option to 'install/download' the web page/application. That should put an icon on your homescreen or desktop that you can thereafter access without Internet access!

## To Build and Test

- Grab a local copy of Github.com/eocOnline/Rangertrak
- Install NodeJS and NPM
- cd RangerTrak
- npm install
- ng serve -o

- or Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

For productino release:
 npm run build --release (???)
 ng build

## Running unit tests

- Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).
- None currently!

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

- None currently!

## To update documentation

npm run compodoc
See <https://compodoc.app/guides/usage.html> and <https://compodoc.app/> for details

## To update Version

stage any changes (or add '--allow-empty' to the following), then
git commit -m "Release-As: 0.11.40"
which *SHOULD* (but doesn't) update version # in Package.json & Package-lock.json
Some details in service/settings.service.ts & app.component.ts
<https://github.com/googleapis/release-please#how-do-i-change-the-version-number>

## To Deploy to Google Firebase

ng deploy

ng add @angular/fire

// ignore the rest?
From: <https://www.tutorialspoint.com/firebase/firebase_deploying.htm>
https://console.firebase.google.com/u/0/project/_/hosting~2Fsites leads to https://console.firebase.google.com/u/0/project/rangertrak-a6dc5/hosting/sites


firebase login (as john@VashonSoftware.com)
firebase init
firebase deploy
or
firebase deploy --only hosting:rangertrak-a6dc5
See angular.json and firebase.json

## Architecture

<img src="./src/docs/PlantUML-Class Diagram.png" alt="PlantUML-Class Diagram" style="height:300px; width:100%; align:right;"/>
![This architecural diagram is unimplemented yet]( .\src\docs\RangerTrak.png "Future architectural diagram")

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## eoc.online

<http://eoc.online> provides free tools for Emergency Operations Centers and emergency services. For more information and to report issues please visit <http://eoc.online>.

©2022 eoc.online, under the MIT License
