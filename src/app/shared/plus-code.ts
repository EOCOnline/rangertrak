function PlusCode() {
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
  MAIN.dbug("chkPCodes got '" + pCode + "'")
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
