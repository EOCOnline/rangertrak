// https://codepen.io/fractalkitty/pen/yLpKdvG
// From: https://codepen.io/JohnsPen/pen/jOYvOOq
//

import p5 from 'p5'

/**
 * https://blog.kakeragames.com/2022/02/20/p5-typescript.html
 * $ npm i --save p5
 * $ npm i --save-dev @types/p5
 * $ npm i --save-dev parcel
 */

/*
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: black;
}
*/

//import {} from

export class CircleHatch {

  //static sleep(ms: number) {

  //nothing special here - just hatching for images
  //click to add hatching focal points and press any key to pause.
  private fArray = []
  private painting//acrylic from a few years ago
  private hatchSize = 100//size of hatch
  private hatchToggle = true
  //private cx, cy
  private chatchSize = 1
  bg

  preload() {
    //bg = loadImage('https://assets.codepen.io/4559259/painting+copy.png')
    this.bg = loadImage('./../../assets/imgs/painting.png')
  }

  setup() {
    const h = this.window.windowHeight * 0.95
    const w = h * this.bg.width / this.bg.height
    let cnv = this.createCanvas(w, h)//canvas creation
    strokeWeight(0.5)
    let cx = 0.5 * width
    let cy = 0.427 * height
    this.fArray[0] = this.createVector(cx, cy)
  }

  draw() {
    if (this.hatchToggle) {
      for (let i = 0; i < 10; i++) {
        //classicHatch()
        for (let j = 0; j < this.fArray.length; j++) {
          this.circleHatch(this.fArray[j].x, this.fArray[j].y)
        }
      }
      //decrease hatch size
      if (this.hatchSize > 5) {
        this.hatchSize -= 0.5
      }
    }
  }

  circleHatch(cx: number, cy: number) {
    const x = Math.random() * width
    const y = Math.random() * height
    let pixCol = this.bg.get(this.bg.width / (width / x), this.bg.height / (height / y))
    stroke(pixCol)
    const r = dist(cx, cy, x, y)
    let theta = Math.atan((y - cy) / (x - cx))
    const hs = Math.min(200, this.chatchSize / 10)
    d = Math.random() * (Math.PI / (hs + 10), Math.PI / (hs))
    noFill()
    if (cx >= x && cy >= y) {
      theta = theta + Math.PI
      Math.arc(cx, cy, r * 2, r * 2, theta - d, theta + d)
    }
    if (cx >= x && cy < y) {
      theta = theta - Math.PI
      arc(cx, cy, r * 2, r * 2, theta - d, theta + d)
    }
    if (cx < x && cy <= y) {
      arc(cx, cy, r * 2, r * 2, theta - d, theta + d)
    }
    if (cx < x && cy > y) {
      arc(cx, cy, r * 2, r * 2, theta - d, theta + d)
    }
    this.chatchSize += 0.05

  }

  //change the focal point
  mousePressed() {
    this.fArray[this.fArray.length] = createVector(mouseX, mouseY)
    this.chatchSize = 1
  }

  keyPressed() {
    this.hatchToggle = !this.hatchToggle
  }

  classicHatch() {
    //random x in the canvas
    const x = Math.random() * width
    //random y in the canvas
    const y = Math.random() * height
    //get the (x,y) color for that position on the canvas
    const pixCol = this.bg.get(this.bg.width / (width / x), this.bg.height / (height / y))
    //set stroke to pixel color
    stroke(pixCol)
    //randomizing hatch size within decreasing range
    d = Math.random() * this.hatchSize
    line(x - d / 2, y - d / 2, x + d / 22, y + d / 2)
    //crosshatch
    //line(x-d/2,y+d/2,x-d/22,y-d/2)
  }
}
