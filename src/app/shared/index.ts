
export { Utility } from "./utility"
export { AlertsComponent } from "./alerts/alerts.component"
export { BackToTopComponent } from "./back-to-top/back-to-top.component"
export { DisclosureComponent } from "./disclosure/disclosure.component"
export { HeaderComponent } from "./header/header.component"
export { PageComponent } from "./page/page.component"
export { IconsComponent } from "./icons/icons.component"
export { FooterComponent } from "./footer/footer.component"
export { InstallUpdateComponent } from "./install-update/install-update.component"
export { NavbarComponent } from "./navbar/navbar.component"
export { TimePickerComponent } from './time-picker/time-picker.component'

export { LayerType, Map, MapType } from './mapping/map.interface'
export { CodeArea, OpenLocationCode } from "./mapping/open-location-code"  // HAD TO REMMOVE default KEYWORD????
export { GeocodingProvider, GeocodeResult, GEOCODING_PROVIDER } from "./mapping/geocoding-provider.interface"
export { NominatimGeocoder } from "./mapping/nominatim-geocoder"
export { GoogleGeocoder } from "./mapping/google-geocoder"
// ./mapping/map-style is deliberately NOT re-exported - see the note in mapping/index.ts.
export { DDToDMS, DDToDDM, DMSToDD, DDMToDD, DirEnum, DirType } from "./mapping/coordinate"
export { AbstractMap } from "./mapping/map"
export { rangerIconFor } from "./mapping/ranger-icon"
export { hashString } from "./mapping/hash-color"
export { formatReportTime } from "./mapping/report-time"

// !BUG: Can't find @What3Words/API - need to install it?!
// export { What3Words } from './mapping/3words'
