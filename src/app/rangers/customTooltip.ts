import { ITooltipComp, ITooltipParams } from 'ag-grid-community'

export class CustomTooltip implements ITooltipComp {
  eGui: any;
  init(params: ITooltipParams & { color: string }) {
    const eGui = (this.eGui = document.createElement('div'));
    const color = params.color || 'white';
    const data = params.api!.getDisplayedRowAtIndex(params.rowIndex!)!.data;

    eGui.classList.add('custom-tooltip');
    //@ts-ignore
    eGui.style['background-color'] = color
    //! BUGBUG: IMage directory is hardcoded, NOT obtained from ${this.settings.imageDirectory}
    // src= "${this.settings.imageDirectory}${params.data.image}">
    eGui.innerHTML = `
    <p>
    <img class="licenseImg" style="height:256px; width:256px;" alt= "${params.data.fullName}"
    src= "./assets/imgs/${params.data.image}"><br>
                <span class"name">&nbsp;&nbsp;${data.fullName}</span> - <span >callsign: </span>
                ${data.callsign}
            </p>`

  }

  getGui() {
    return this.eGui;
  }
}
