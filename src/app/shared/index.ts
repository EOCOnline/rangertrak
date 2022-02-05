/*
import { Ranger, RangerService, Callsigns } from "./ranger.service";
import { Team, TeamService } from "./team.service";
import { FieldReportService } from "./field-report.service";
import { FieldReport } from "./field-report";
import { LocalStorageService } from "./local-storage.service";
import { DataService } from "./data.service";
import { CodeArea, OpenLocationCode } from "./data.service";
// import { DataService } from "./data.service";
*/
// import { OpenLocationCode } from "./open-location-code"

//export { RangerService, RangerType, RangerStatus } from "./ranger.service";
//export { TeamService, TeamType } from "./team.service";
//export { FieldReportService, FieldReportType, FieldReportSource, FieldReportStatuses } from "./field-report.service";

export { Map, LayerType } from "./map";
export { OpPeriod } from "./op-period";
export { Mission } from "./mission";
export { CodeArea, OpenLocationCode } from "./open-location-code"  // HAD TO REMMOVE default KEYWORD????
//export { What3Words } from "./3words"
export { GoogleGeocode } from "./google-geocode"
export { Utility } from "./utility"
// not exported: GetLatLongFrom3Words

export { DDToDMS } from "./coordinate"
//export { MarkerService } from "./marker.service";
//export { PopupService } from "./popup.service";
//export { ShapeService } from "./shape.service";
//export { DataService } from "./data.service";
