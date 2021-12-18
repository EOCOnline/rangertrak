import { Injectable, OnInit } from '@angular/core';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';
import { RangerService, Statuses, TeamService } from './index';

export enum FieldReportSource {
  Voice,
  Packet,
  APRS,
  Email
}

export type FieldReportType = {
  who: { callsign: String, team: String },
  where: { address: String, lat: Number, long: Number },
  when: { date: Date},
  what: { status: String, note: String }
}

@Injectable({ providedIn: 'root' })
export class FieldReportService {

  rangerService
  teamService
  private fieldReports: FieldReportType[] = []

  constructor(rangerService: RangerService, teamService: TeamService) {
    this.rangerService = rangerService
    this.teamService = teamService
   }

  pushFieldReport(formData: string) {
    console.log('FieldReportService: Got new field report: ')
    console.log(formData)

    let newReport: FieldReportType = JSON.parse(formData)
    // TODO: verify new report is proper shape/validated...
    this.fieldReports.push(newReport)
    //debug()
  }

  getFieldReports() {
    return this.fieldReports
  }

  sortFieldReportsByCallsign() {
    let sortedFieldReports: FieldReportType[] = this.fieldReports.sort() // use default lexicographical sort - of 1st field

  }

  sortFieldReportsByDate() {
    let sortedFieldReports: FieldReportType[] = this.fieldReports.sort((n1, n2) => {
      if (n1.when > n2.when) {
        return 1;
      }
      if (n1.when < n2.when) {
        return -1;
      }
      return 0;
    })
    return sortedFieldReports
  }

  sortFieldReportsByTeam() {
    let sortedFieldReports: FieldReportType[] = this.fieldReports.sort((n1, n2) => {
      if (n1.who.team > n2.who.team) {
        return 1;
      }
      if (n1.who.team < n2.who.team) {
        return -1;
      }
      return 0;
    })
    return sortedFieldReports
  }

  // Save to disk or ...
  serialize(name: string) {
    ;
  }

  load(name: string) {
    ;
  }

  generateFakeData(array: FieldReportType[], num: number = 15) {

    let teams = this.teamService.getTeams()
    let rangers = this.rangerService.getRangers()
    let streets = ["Ave", "St.", "Pl.", "Court", "Circle"]
    let notes = ["Reports beautiful sunrise", "Roudy Kids", "Approaching Neighborhood CERT", "Confused & dazed in the sun",
                  "Wow", "na", "Can't hear you", "Bounced via tail of a comet!", "Need confidential meeting: HIPAA", "Getting overrun by racoons"]
    //let numberPushed = 0

    console.log("Generating " + num + " more rows of FAKE field reports!")

    for (let i = 0; i < num; i++) {
      array.push({
        who: {
          callsign: rangers[Math.floor(Math.random() * rangers.length)].callsign,
          team: teams[Math.floor(Math.random() * teams.length)].name
        },
        where: {
          address: (Math.floor(Math.random() * 10000)) + " SW " + streets[(Math.floor(Math.random() * streets.length))],
          lat: 45 + Math.floor(Math.random() * 2000) / 1000,
          long: -121 + Math.floor(Math.random() * 1000) / 1000
        },
        when: {
          date: new Date
        },
        what: {
          status: Statuses[Math.floor(Math.random() * Object.keys(Statuses).length)],
          note: notes[Math.floor(Math.random() * notes.length)]
        }
      })
    }
    //console.log("Pushed # " + numberPushed++)
  }

}
/*
@Injectable({ providedIn: 'root' })
export class FieldReport {
}
*/
