export type Map = L.Map | google.maps.Map

export enum MapType {
  Google,
  ESRI_Leaflet
}

export interface LayerType {
  id: number
  url: string,
  id2: string,
  attribution: string
}

/*
  Interface are general, lightweight vs. abstract classes as special-purpose/feature-rich (pg 96, Programming Typescript)
  export interface IMap {
    type: MapType,
    layers: LayerType,
    initMap():void,
    displayBeautifulmap(num:number) :void
    }
*/
