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


}
