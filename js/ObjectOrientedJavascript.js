// Object oriented javascript...
  function PointDD([latDD, lngDD]) {
    // constructor
    this.latDD = latDD;
    this.lngDD = lngDD;
    
    //this.latDMS = DDToDMS(latDD, false);
    //this.lngDMS = DDToDMS(lngDD, true);
  }
  // Properties defined on the prototype object are inherited by all objects created w/ constructor
  PointDD.prototype.distanceTo = function(that) {
    var dx = this.latDD - that.latDD;
    var dy = this.lngDD - that.lngDD;
    return Math.sqrt(dx*dx + dy*dy);
  }
  PointDD.prototype.toString = functino() {
    return '(' + this.latDD + ", " + this.lngDD + ")";
  }
  // Define static (or class) methods or properties directly to the constructor function, not the prototype object. E.g.,
  PointDD.ORIGIN = new PointDD(0,0);