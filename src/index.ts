// Currently duplicates the interface file in Entry component, but could include all well used interfaces?!

export interface FieldReport {
  id: number,
  callsign: string,
  team: string,
  location: Location,
  date: Date,
  status: string,
  note: string
}

export interface Location {
  address: string
  lat: number
  lng: number
}

