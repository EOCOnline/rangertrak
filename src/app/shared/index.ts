
export { Utility } from "./utility"
export { AlertsComponent } from "./alerts/alerts.component"
export { HeaderComponent } from "./header/header.component"
export { IconsComponent } from "./icons/icons.component"
export { FooterComponent } from "./footer/footer.component"
export { NavbarComponent } from "./navbar/navbar.component"
export { TimePickerComponent } from './time-picker/time-picker.component'

// Mapping & location library interfaces
export { CodeArea, OpenLocationCode } from "./mapping/open-location-code"  // HAD TO REMMOVE default KEYWORD????
export { GoogleGeocode } from "./mapping/google-geocode"
export { DDToDMS, DDToDDM, DMSToDD, DDMToDD, DirEnum, DirType } from "./mapping/coordinate"
export { AbstractMap } from "./mapping/map"

// !BUG: Can't find @What3Words/API - need to install it?!
// export { What3Words } from './mapping/3words'
