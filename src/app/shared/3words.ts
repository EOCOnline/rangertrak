import * as I from "./"


let TWords: string

function chk3Words() {
    /*let settings = {
      "async": true,
      "crossDomain": true,
      "url": "https://api.what3words.com/v3/autosuggest?key=0M5I8UPF&input=index.home.r&n-results=5&focus=51.521251%2C-0.203586&clip-to-country=BE%2CGB",
      "method": "GET",
      "headers": {}
    }

    $.ajax(settings).done(function (response) {
      MAIN.dbug("ddd=" +response)
    })
    */

    // No 3 word results outside these values allowed!!
    // south_lat <= north_lat & west_lng <= east_lng
    let south_lat = 46.0
    let north_lat = 49.0
    let west_lng = -124.0
    let east_lng = -120.0
    let errMsg = ""

    TWords = document.getElementById("address")!.innerHTML // was 'addresses'...
    MAIN.dbug(TWords)
    if (TWords.length) {
        // something entered...
        MAIN.dbug("3Words='" + TWords + "'")
        what3words.api.autosuggest(TWords, {
            nFocusResults: 1,
            //clipTo####: ["US"],
            cliptoboundingbox: { south_lat, west_lng, north_lat, east_lng }, // Clip prevents ANY values outside region
            focus: { lat: DEF_LAT, lng: DEF_LONG }, // Focus prioritizes words closer to this point
            nResults: 1
        })
            .then(function (response) {
                verifiedWords = response.suggestions[0].words
                MAIN.dbug("Verified Words='" + verifiedWords + "'")
                if (TWords != verifiedWords) {
                    document.getElementById("addressLabel")!.textContent = " Verified as: " + verifiedWords
                } else {
                    document.getElementById("addressLabel")!.textContent = " Verified."
                }
                what3words.api.convertToCoordinates(verifiedWords).then(function (response) {
                    //async call HAS returned!
                    updateCoords(response.coordinates.lat, response.coordinates.lng)
                    // NOTE: Not saving nearest place: too vague to be of value
                    document.getElementById("addressLabel")!.textContent += " Near: " + response.nearestPlace
                })
            })
            .catch(function (error) {
                errMsg = "[code]=" + error.code + " [message]=" + error.message + "."
                MAIN.dbug("Unable to verify 3 words entered: " + errMsg)
                document.getElementById("addressLabel")!.textContent = "*** Not able to verify 3 words! ***"
            })
    }
    // async call not returned yet
}
