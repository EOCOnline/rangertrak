
import {  CodeArea, OpenLocationCode as PC, GoogleGeocode } from '../shared/'

// Or use Open-Location-code.tx instead???
export class PlusCode {



  chkPCodes() {
    // https://developer.what3words.com/tutorial/ux-guidelines
    // https://developer.what3words.com/tutorial/javascript
    // https://developer.what3words.com/tutorial/displaying-the-what3words-grid-on-a-google-map

    // #region +Code doc
    // https://plus.codes/developers
    // https://github.com/google/open-location-code/wiki
    /*
       Plus Codes refer to variable-sized rectangles - NOT a point! (The regions do have center points however.)

       Only 20 characters are valid: "23456789CFGHJMPQRVWX"

       Global RegEx: /(^|\s)([23456789C][23456789CFGHJMPQRV][23456789CFGHJMPQRVWX]{6}\+[23456789CFGHJMPQRVWX]{2,3})(\s|$)/?i
       This extracts (in capturing group 2) a global code at the start or end of a string, or enclosed with spaces, but not in the middle of a string.

       Local RegEx: /(^|\s)([23456789CFGHJMPQRVWX]{4,6}\+[23456789CFGHJMPQRVWX]{2,3})(\s|$)/?i

       If the query matches, and the user has not entered any other text, then another location must be used to recover the original code. If you are displaying a map to the user, then use the current map center, pass it to the recoverNearest() method to get a global code, and then decode it as above.

       If there is no map, you can use the device location. If you have no map and cannot determine the device location, a local code is not sufficient and you should display a message back to the user asking them to provide a town or city name or the full global code.

       * * *

       Open Location Codes are encodings of WGS84 latitude and longitude coordinates in degrees. Decoding a code returns an area, not a point. The area of a code depends on the length (longer codes are more precise with smaller areas). A two-digit code has height and width[height_width] of 20 degrees, and with each pair of digits added to the code, both height and width are divided by 20.

       The first digit of the code identifies the row (latitude), and the second digit the column (longitude). Subsequent steps divide that area into a 20 x 20 grid, and use one digit to identify the row and another to identify the column.

       If the query matches, and the user has not entered any other text, then another location must be used to recover the original code. If you are displaying a map to the user, then use the current map center, pass it to the recoverNearest() method to get a global code, and then decode it as above.

       globalPCode = encode(latDD,longDD);  // Need locality/focus (within half a degree latitude and half a degree longitude, or ideally 1/4 degree, 25km at equator) pt to get local +code.

       The shorten() method in the OLC library may remove 2, 4, 6 or even 8 characters, depending on how close the reference location is. Although all of these are valid, we recommend only removing the first 4 characters, so that plus codes have a consistent appearance.
    */
    // #endregion

    //
    let pCode = document.getElementById("addresses")!.innerText //value;
    console.log("chkPCodes got '" + pCode + "'");
    if (pCode.length) {

      let result = this.getLatLngAndAddressFromPlaceID(pCode)
      if (result.position) {
        document.getElementById("addressLabel")!.innerHTML = result.address
        document.getElementById("lat")!.innerHTML = result.position.lat
        document.getElementById("long")!.innerHTML = result.position.long
      }


            if (PC.isValid(pCode)) {
              if (PC.isShort) {
                pCode = PC.recoverNearest(pCode, SettingsService.Settings.defLat, SettingsService.Settings.defLong); //OpenLocationCode.recoverNearest
              }

              // Following needs a full (Global) code
              let coord = this.decode(pCode); //OpenLocationCode.decode
              console.log("chkPCodes got " + pCode + "; returned: lat=" + coord.latitudeCenter + ', long=' + coord.longitudeCenter);

              this.updateCoords(coord.latitudeCenter, coord.longitudeCenter);
            }

      else {
        document.getElementById("addressLabel")!.innerHTML = " is <strong style='color: darkorange;'>Invalid </strong> Try: ";
        document.getElementById("pCodeGlobal")!.innerHTML = SettingsService.Settings.defPlusCode;
      }
    }
  }
}






























// https://github.com/tspoke/typescript-open-location-code
// https://github.com/google/open-location-code

/*

From 4.2:

<!-- is defaultPlusCode or suggested 3 words even needed??? -->
                Plus Code<input id="defPlusCode" value="" hidden>

// Set focus for 3 words, PlusCodes and center of displayed big map
  var DEF_LAT = 47.4472;
  var DEF_LONG = -122.4627;  // Vashon EOC!
  var DEF_PCODE = 'CGWP+VV'; // '84VVCGWP+VW'is in the middle of the Pacific Ocean!!!; // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
  var defPCodeLabel = " for Vashon, WA locale; Full code: ";
  // Set form default

document.getElementById("defPlusCode").value = DEF_PCODE;
//$("#defPlusCode").value = DEF_PCODE;

DEF_PCODE = document.getElementById("defPlusCode").value;



function  updateCoords(latDD, lngDD) {
    dbug("New Coordinates: lat:" + latDD + "; lng:" + lngDD);

    document.getElementById("latitudeDD").value = latDD;
    document.getElementById("longitudeDD").value = lngDD;

    latDMS = DDToDMS(latDD, false);
    document.getElementById("latitudeQ").value = latDMS.dir;
    document.getElementById("latitudeD").value = latDMS.deg;
    document.getElementById("latitudeM").value = latDMS.min;
    document.getElementById("latitudeS").value = latDMS.sec;

    lngDMS = DDToDMS(lngDD, true);
    document.getElementById("longitudeQ").value = lngDMS.dir;
    document.getElementById("longitudeD").value = lngDMS.deg;
    document.getElementById("longitudeM").value = lngDMS.min;
    document.getElementById("longitudeS").value = lngDMS.sec;

    var pCode = encode(latDD, lngDD, 11); // OpenLocationCode.encode using default accuracy returns an INVALID +Code!!!
    dbug("updateCoords: Encode returned PlusCode: " + pCode);
    var fullCode;
    if (pCode.length!=0) {

      if (isValid(pCode)) {
        if (pCode.isShort) {
          // Recover the full code from a short code:
          fullCode = recoverNearest(pCode, DEF_LAT, DEF_LONG); //OpenLocationCode.recoverNearest
        } else {
          fullCode = pCode;
          dbug("Shorten +Codes, Global:" + fullCode + ", Lat:" + DEF_LAT + "; Long:"+ DEF_LONG);
          // Attempt to trim the first characters from a code; may return same value...
          pCode = shorten(fullCode, DEF_LAT, DEF_LONG); //OpenLocationCode.shorten
        }
        dbug("New PlusCodes: " + pCode + "; Global: " + fullCode);
        //document.getElementById("addresses").value = pCode;
        //document.getElementById("addressLabel").innerHTML = defPCodeLabel;
        document.getElementById("pCodeGlobal").innerHTML = " &nbsp;&nbsp; +Code: " + fullCode;
      } else {
        dbug("Invalid +PlusCode: " + pCode);
        document.getElementById("pCodeGlobal").innerHTML = " &nbsp;&nbsp; Unable to get +Code"
        //document.getElementById("addressLabel").innerHTML = "  is <strong style='color: darkorange;'>Invalid </strong> Try: ";
      }
    }

    //ToDO: Update 3 words too!
   if (initialized) displaySmallMap(latDD, lngDD);
 }

*/



function PlusCode2() {
  // #region +Code doc
  // https://plus.codes/developers
  // https://github.com/google/open-location-code/wiki
  /*
     Plus Codes refer to variable-sized rectangles - NOT a point! (The regions do have center points however.)

     Only 20 characters are valid: "23456789CFGHJMPQRVWX"

     Global RegEx: /(^|\s)([23456789C][23456789CFGHJMPQRV][23456789CFGHJMPQRVWX]{6}\+[23456789CFGHJMPQRVWX]{2,3})(\s|$)/?i
     This extracts (in capturing group 2) a global code at the start or end of a string, or enclosed with spaces, but not in the middle of a string.

     Local RegEx: /(^|\s)([23456789CFGHJMPQRVWX]{4,6}\+[23456789CFGHJMPQRVWX]{2,3})(\s|$)/?i

     If the query matches, and the user has not entered any other text, then another location must be used to recover the original code. If you are displaying a map to the user, then use the current map center, pass it to the recoverNearest() method to get a global code, and then decode it as above.

     If there is no map, you can use the device location. If you have no map and cannot determine the device location, a local code is not sufficient and you should display a message back to the user asking them to provide a town or city name or the full global code.

     * * *

     Open Location Codes are encodings of WGS84 latitude and longitude coordinates in degrees. Decoding a code returns an area, not a point. The area of a code depends on the length (longer codes are more precise with smaller areas). A two-digit code has height and width[height_width] of 20 degrees, and with each pair of digits added to the code, both height and width are divided by 20.

     The first digit of the code identifies the row (latitude), and the second digit the column (longitude). Subsequent steps divide that area into a 20 x 20 grid, and use one digit to identify the row and another to identify the column.

     If the query matches, and the user has not entered any other text, then another location must be used to recover the original code. If you are displaying a map to the user, then use the current map center, pass it to the recoverNearest() method to get a global code, and then decode it as above.

     globalPCode = encode(latDD,longDD)  // Need locality/focus (within half a degree latitude and half a degree longitude, or ideally 1/4 degree, 25km at equator) pt to get local +code.

     The shorten() method in the OLC library may remove 2, 4, 6 or even 8 characters, depending on how close the reference location is. Although all of these are valid, we recommend only removing the first 4 characters, so that plus codes have a consistent appearance.
  */
  // #endregion


  //
  let pCode = document.getElementById("addresses")!.innerHTML
  //MAIN.dbug("chkPCodes got '" + pCode + "'")
  if (pCode.length != 0) {
      if (isValid(pCode)) {
          if (pCode.isShort) {
              pCode = recoverNearest(pCode, DEF_LAT, DEF_LONG) //OpenLocationCode.recoverNearest
          }

          // Following needs a full (Global) code
          let coord = decode(pCode) //OpenLocationCode.decode
          MAIN.dbug("chkPCodes got " + pCode + " returned: lat=" + coord.latitudeCenter + ', long=' + coord.longitudeCenter)

          updateCoords(coord.latitudeCenter, coord.longitudeCenter)
      } else {
          document.getElementById("addressLabel").innerHTML = " is <strong style='color: darkorange'>Invalid </strong> Try: "
          document.getElementById("pCodeGlobal").innerHTML = DEF_PCODE
      }
  }
}
