//import CryptoES from 'crypto-es'

export class Utility {

  static sleep(ms: number) {
    // TODO try delay instead...
    // import { delay } from 'rxjs/operators'
    // delay(ms)
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static strToLatLng(str: string) {
    const latlngStr = str.split(",", 2);
    return new google.maps.LatLng(parseFloat(latlngStr[0]), parseFloat(latlngStr[1]))
  }

  // also consider string.padStart()
  static zeroFill(integ: number, lngth: number) {
    var strg = integ.toString();
    while (strg.length < lngth)
      strg = "0" + strg;
    return strg;
  }

  /*
  Ideas for resetting fade: after Submit button, fade the entry details
  https://www.sitepoint.com/css3-animation-javascript-event-handlers/
  https://css-tricks.com/controlling-css-animations-transitions-javascript/
  https://www.smashingmagazine.com/2013/04/css3-transitions-thank-god-specification/#a2
  https://stackoverflow.com/questions/6268508/restart-animation-in-css3-any-better-way-than-removing-the-element
  https://css-tricks.com/restart-css-animation/
  https://gist.github.com/paulirish/5d52fb081b3570c81e3a
*/
  static resetMaterialFadeAnimation(element: HTMLElement) {
    // this.log.excessive(`Fade Animation reset`, this.id)
    element.style.animation = 'none';
    element.offsetHeight; // trigger reflow
    element.style.animation = "";
  }

  // https://github.com/entronad/crypto-es
  // https://github.com/brix/crypto-js
  // https://cryptojs.gitbook.io/docs/
  // https://www.w3schools.com/nodejs/ref_crypto.asp

  static encrypt(data: string, secretKey: string) {
    //crypto.
    //return Crypto.AES.encrypt(JSON.stringify(data), secretKey).toString();
    /*
        var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        let nonce = ''
        let path = ''
        const hashDigest = sha256(nonce + message);

        //const hmacDigest =
        return Base64.stringify(hmacSHA512(path + hashDigest, privateKey))
        */
  }

  static decrypt(cipherText: string, privateKey: string) {
    //return CryptoJS.AES.decrypt(cipherText, privateKey)

    //return crypto.DES.decrypt(cipherText, privateKey);
    /*
        let nonce = ''
        let path = ''
        const hashDigest = sha256(nonce + message);

        //const hmacDigest =
        return Base64.stringify(hmacSHA512(path + hashDigest, privateKey))
        */
  }

  static displayHide(htmlElement: HTMLElement) {
    if (htmlElement) {
      htmlElement.style.visibility = "hidden";
    } else {
      console.warn(`Could not hide null HTML Element`)
    }
  }

  static displayShow(htmlElement: HTMLElement) {

    // if (htmlElement.startsWith("#")) {
    if (htmlElement) {
      htmlElement.style.visibility = "visible";
    } else {
      console.warn(`Could not show null HTML Element`)
    }
    //   } else if(htmlElement.startsWith(".")) {
    //   let e = Array.from(this.document.getElementsByClassName(htmlElement))
    //   if (e) {
    //     let i: Element
    //     for (const i of e) {
    //       if (i) {
    //         i.style.visibility = "visible";
    //       }
    //     }
    //   }
    // }
    //     else {
    //   this.log.error("Expected 1st char of . (for Class), or # (for ID).", this.id)
    // }

  }

  //--------------------------------------------------------------------------


  static getConfirmation(msg: string) {
    if (confirm(msg) == true) {
      return true; //proceed
    } else {
      return false; //cancel
    }
  }

  /**
 *
 * @param startTime - in milliseconds
 * @param endTime - in ms
 * @param secPrecision --  # digits after the decimal point - max of 3
 * @returns { days: days, hours: hours, minutes: min, seconds: sec }
 */
  static timeDiff(startTime: number, endTime: number, secPrecision = 0) {
    /* shorthand version:
      let ms = new Date().getTime() - msStartTime
      let d = Math.trunc((ms / (1000 * 60 * 60 * 24)))
      return `${d ? (d + ' day(s), ') : " "}${Math.trunc((ms / (1000 * 60 * 60)) % 24)}:${Math.trunc(Math.abs(ms) / (1000 * 60)) % 60).toString().padStart(2, '0')}:${(Math.round(Math.abs(ms) / 1000) % 60).toString().padStart(2, '0')}`
     */
    const msPerSecond = 1000
    const msPerMinute = msPerSecond * 60
    const msPerHour = msPerMinute * 60
    const msPerDay = msPerHour * 24

    let isNegative = false
    let ms = endTime - startTime
    if (ms < 0) {
      isNegative = true
      ms = -ms
    }

    let days = Math.trunc(ms / msPerDay)
    let msLeft = ms % msPerDay

    let hours = Math.trunc(msLeft / msPerHour)
    msLeft = ms % msPerHour

    let min = Math.trunc(msLeft / msPerMinute)
    msLeft = ms % msPerMinute

    let sec = Math.round(msLeft / msPerSecond * (10 ** secPrecision)) / (10 ** secPrecision)

    // Stringify, in case desired...
    let strDay = ``
    let strHours = `${hours}`
    if (days) {
      strDay = days + ` day` + (days == 1 ? `, ` : `s, `)
    } else {
      if (isNegative) {
        strHours = '-' + strHours
      }
    }
    let timeAsString = `${strDay}${strHours}:${(min).toString().padStart(2, '0')}:${(sec).toString().padStart(2, '0')}`

    return { negative: isNegative, days: days, hours: hours, minutes: min, seconds: sec, string: timeAsString }
  }

}
