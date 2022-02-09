// utility.js

function dbug(msg, alerts) {
    var dt = new Date();
    var time = zeroFill(dt.getHours(),2) + ":" + zeroFill(dt.getMinutes(),2) + ":" + zeroFill(dt.getSeconds(),2) + ":" + zeroFill(dt.getMilliseconds(),4);
    var dbugLog = time + "-  &nbsp;&nbsp;" + msg + "<br>" + document.getElementById("dbugLog").innerHTML;
    document.getElementById("dbugLog").innerHTML = dbugLog;
    // TODO: Only if settings say to do this!
    // console.log("Ranger Track: " + dbugLog); // Convert dbugLog from HTML to plain text...
    if (alerts==true) {
      $('#alerts').html(time + "-  &nbsp;&nbsp;" + msg); //<strong>Alert!</strong> "+ 
      $('#alerts').fadeIn().delay(2500).fadeOut();  // "<strong>Alert!</strong> "+
    }
  }

  function zeroFill(integ, lngth) {
    var strg = integ.toString();
    while (strg.length < lngth)
      strg = "0" + strg;
    return strg;
  }

   //https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
   function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getCheckedRadioValue(radioGroupName) {
    var rads = document.getElementsByName(radioGroupName);
    var i;
    for (i=0; i < rads.length; i++)
     if (rads[i].checked)
       return rads[i].value;
    return null; // or undefined, or your preferred default for none checked
   }
 
  	// localStorage/sessionStorage is stored per browser
  //#region
  // https://stackoverflow.com/questions/23652437/how-to-retrieve-the-all-local-storage-data
  function localStorageCatalog() {
    local = localStorage;
    for (var key in local) {
      //console.log(key);
      dbug("Local Storage key="+key+"; Type="+local[key].type);
      //Do something with key, access value by local[key]
    }
  }

  function localStorageSupported(){
    return (typeof(Storage) !== "undefined");
  }
  


  function saveToLocalStorage (data) {
    var dataJSON = JSON.stringify(data);
    localStorage.setItem("LOCAL_STORAGE_NAME", dataJSON);
  }

  function loadFromLocalStorage () {
    var locsText = localStorage.getItem("LOCAL_STORAGE_NAME");
    return JSON.parse(locsText);
  }

  function deleteLocalStorage () {
    localStorage.removeItem("LOCAL_STORAGE_NAME");
  }
  //#endregion

  /* from: https://jsfiddle.net/aryzhov/pkfst550
  * Binary search in JavaScript.
  * Returns the index of of the element in a sorted array or (-n-1) where n is the insertion point for the new element.
  * Parameters:
  *     ar - A sorted array
  *     el - An element to search for
  *     compare_fn - A comparator function. The function takes two arguments: (a, b) and returns:
  *        a negative number  if a is less than b;
  *        0 if a is equal to b;
  *        a positive number of a is greater than b.
  * The array may contain duplicate elements. If there are more than one equal elements in the array, 
  * the returned value can be the index of any one of the equal elements.
  */
 function binaryStringSearch(ar, el) {
    var m = 0;
    var n = ar.length - 1;
    while (m <= n) {
        var k = (n + m) >> 1;
        if (el > ar[k].Callsign) {
            m = k + 1;
        } else if(el < ar[k].Callsign) {
            n = k - 1;
        } else {
          return ar[k].Licensee;
        }
    }
    return "No Licensee"; // -m - 1;
}

/*  TODO:
//// Sticky top tabs, from https://www.w3schools.com/howto/howto_js_navbar_sticky.asp
// When the user scrolls the page, execute setStickyTabs 
window.onscroll = function() {setStickyTabs()};

// Get the navbar
var navbar = document.getElementsByClassName("ui-tabs-nav");

// Get the offset position of the navbar
var sticky = navbar.offsetTop;

// Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
function setStickyTabs() {
  if (window.pageYOffset >= sticky) {
    navbar.classList.add("sticky")
  } else {
    navbar.classList.remove("sticky"); // gets: Cannot read property 'remove' of undefined
  }
}
*/