import { min } from 'rxjs'

import { Component, OnInit } from '@angular/core'

const bg = loadImage('../../assets/imgs/painting+copy.png')

@Component({
  selector: 'rangertrak-circle-hatching',
  template: `
    <p>
      circle-hatching works!
    </p>
  `,
  styleUrls: ['./circle-hatching.component.scss']
})
export class CircleHatchingComponent implements OnInit {

  //nothing special here - just hatching for images
  //cliack to add hatching focal points and press any key to pause.
  fArray = []
  painting;//acrylic from a few years ago
  hatchSize = 100;//size of hatch
  hatchToggle = true;
  cx: number = 0
  cy: number = 0
  chatchSize = 1;

  constructor() { }

  ngOnInit(): void {
    const h = windowHeight * 0.95;
    const w = h * bg.width / bg.height;
    const cnv = createCanvas(w, h);//canvas creation
    strokeWeight(0.5);
    this.this.cx = 0.5 * width;
    this.cy = 0.427 * height
    this.fArray[0] = createVector(this.cx, this.cy);

  }

  preload() {
    const bg = loadImage('../../assets/imgs/painting+copy.png')
  }

  setup() {
  }

  draw() {
    if (this.hatchToggle) {
      for (let i = 0; i < 10; i++) {
        //classicHatch();
        for (let j = 0; j < this.fArray.length; j++) {
          this.circleHatch(this.fArray[j].x, this.fArray[j].y)
        }
      }
      //decrease hatch size
      if (this.hatchSize > 5) {
        this.hatchSize -= 0.5;
      }
    }
  }

  circleHatch(cx, cy) {
    //cx, cy
    const x = random(0, width);
    const y = random(0, height);
    const pixCol = bg.get(bg.width / (width / x), bg.height / (height / y));
    stroke(pixCol);
    const r = dist(cx, cy, x, y);
    const theta = atan((y - cy) / (x - cx));
    const hs = min(200, chatchSize / 10);
    const d = random(PI / (hs + 10), PI / (hs))
    noFill()
    if (cx >= x && cy >= y) {
      const theta = theta + PI
      arc(cx, cy, r * 2, r * 2, theta - d, theta + d);
    }
    if (cx >= x && cy < y) {
      const theta = theta - PI
      arc(cx, cy, r * 2, r * 2, theta - d, theta + d);
    }
    if (cx < x && cy <= y) {
      arc(cx, cy, r * 2, r * 2, theta - d, theta + d);
    }
    if (cx < x && cy > y) {
      arc(cx, cy, r * 2, r * 2, theta - d, theta + d);
    }
    this.chatchSize += 0.05;
  }

  //change the focal point
  mousePressed() {
    this.fArray[this.fArray.length] = createVector(mouseX, mouseY)
    this.chatchSize = 1;
  }

  keyPressed() {
    hatchToggle = !hatchToggle
  }

  classicHatch() {
    //random x in the canvas
    const x = random(0, width);
    //random y in the canvas
    const y = random(0, height);
    //get the (x,y) color for that position on the canvas
    const pixCol = bg.get(bg.width / (width / x), bg.height / (height / y));
    //set stroke to pixel color
    stroke(pixCol);
    //randomizing hatch size within decreasing range
    const d = random(0, this.hatchSize)
    line(x - d / 2, y - d / 2, x + d / 22, y + d / 2);
    //crosshatch
    //line(x-d/2,y+d/2,x-d/22,y-d/2);
  }

}
