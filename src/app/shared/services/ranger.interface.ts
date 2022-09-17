export interface RangerType {
  callsign: string
  fullName: string
  phone: string
  address: string
  image: string
  rew: string   // WA's Registered Emergency Worker number
  team: string
  role: string
  note: string
}

export const UnknownRanger: RangerType = {
  callsign: "Unknown",
  fullName: "Unknown Ranger",
  phone: "",
  address: "",
  image: "",
  rew: "",   // WA's Registered Emergency Worker number
  team: "",
  role: "",
  note: "Unknown Ranger entered. Go to Rangers page & enter new folks there!",
}
