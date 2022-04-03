 //  -------------------------------------  UNUSED  -------------------------------------

 public onMapMouseMove_unused(event: MouseEvent) {
  this.log.excessive(`onMapMouseMove: ${JSON.stringify(event)}`, this.id)
  //let ev = event as L.LeafletMouseEvent
  //this.mouseLatLng = { lat: event.latlng.lat, lng: event.latlng.lng }
}


private displayAllMarkers_NoCluster_Unused() {
  // REVIEW: wipes out any not previously saved...
  this.fieldReports?.fieldReportArray.forEach(i => {
    this.addMarker(i.lat, i.lng, i.status)
  })
}

private zoomed_unused() {
  if (this.zoom && this.map) {
    this.zoom = this.map.getZoom()
  }
}

// Create GeoJSON layer & add to map
// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service
initShapesLayer_Unused() {
  /*
      const shapeLayer = L.geoJSON(this.shapes, {
        style: (feature) => ({
          weight: 3,
          opacity: 0.5,
          color: '#008f68',
          fillOpacity: 0.8,
          fillColor: '#6DB65B'
        }),
        onEachFeature: (feature, layer) => (
          layer.on({
            mouseover: (e) => (this.highlightFeature(e)),
            mouseout: (e) => (this.resetFeature(e)),
          })
        )
      });

      if (this.map) {
        this.map.addLayer(shapeLayer);
      }
      shapeLayer.bringToBack();
    }

    //  attach mouseover & mouseout events to interact with each of the (state) shapes
    private highlightFeature(e: L.LeafletMouseEvent) {
      const layer = e.target;

      layer.setStyle({
        weight: 10,
        opacity: 1.0,
        color: '#DFA612',
        fillOpacity: 1.0,
        fillColor: '#FAE042'
      });
    }

    private resetFeature(e: L.LeafletMouseEvent) {
      const layer = e.target;

      layer.setStyle({
        weight: 3,
        opacity: 0.5,
        color: '#008f68',
        fillOpacity: 0.8,
        fillColor: '#6DB65B'
      });
    }
    */
}


private createMarker() {
  const mapIcon = this.getDefaultIcon();
  // const coordinates = latLng([this.mapPoint.latitude, this.mapPoint.longitude]);
  // this.lastLayer = marker(coordinates).setIcon(mapIcon);
  // this.markerClusterGroup.addLayer(this.lastLayer)
}

private addLayersToMap() {
  this.markerClusterGroup.addTo(this.map!);
}

private addCircle_unused(lat: number, lng: number, status: string = '') {
  const circle = new L.CircleMarker([lat, lng], { radius: 20 })
  if (this.map) {
    circle.addTo(this.map)
  }
}

private static scaledRadius_unused(val: number, maxVal: number): number {
  return 20 * (val / maxVal);
}

// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-marker-service
private addCircles() {
  //const maxPop = Math.max(...res.features.map(x => x.properties.population), 0);
  /*
   this.httpClient.get(this.capitals).subscribe((res: any) => {

     const maxPop = Math.max(...res.features.map(x => x.properties.population), 0);

     for (const c of res.features) {
       const lon = c.geometry.coordinates[0];
       const lat = c.geometry.coordinates[1];
       const circle = L.circleMarker([lat, lon], {
         radius: MarkerService.scaledRadius(c.properties.population, maxPop)
       });

        circle.bindPopup(this.popupService.makeCapitalPopup(c.properties));

       circle.addTo(map);
     }
   });
   */
}

// do this in a service??
private makeCapitalPopup(data: any): string {
  return `` +
    `<div>Capital: ${data.name}</div>` +
    `<div>State: ${data.state}</div>` +
    `<div>Population: ${data.population}</div>`
}

private initStatesLayer() {
  /* https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service Show borders of all the states in the US
    const stateLayer = L.geoJSON(this.states, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#008f68',
        fillOpacity: 0.8,
        fillColor: '#6DB65B'
      }),
      onEachFeature: (feature, layer) => (
      layer.on({
        mouseover: (e) => (this.highlightFeature(e)),
        mouseout: (e) => (this.resetFeature(e)),
      })
    )
    });

    this.map!.addLayer(stateLayer);
    */
}

// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service
private highlightFeature(e: { target: any; }) {
  const layer = e.target;

  layer.setStyle({
    weight: 10,
    opacity: 1.0,
    color: '#DFA612',
    fillOpacity: 1.0,
    fillColor: '#FAE042'
  });
}

private resetFeature(e: { target: any; }) {
  const layer = e.target;

  layer.setStyle({
    weight: 3,
    opacity: 0.5,
    color: '#008f68',
    fillOpacity: 0.8,
    fillColor: '#6DB65B'
  });
}
