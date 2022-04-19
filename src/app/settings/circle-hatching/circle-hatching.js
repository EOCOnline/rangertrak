
//nothing special here - just hatching for images
//cliack to add hatching focal points and press any key to pause.
let fArray = []
let painting;//acrylic from a few years ago
let hatchSize = 100;//size of hatch
let hatchToggle = true;
let cx, cy;
let chatchSize = 1;
function preload() {
  bg = loadImage('../../assets/imgs/painting+copy.png');;
}
function setup() {
  h = windowHeight * 0.95;
  w = h * bg.width / bg.height;
  cnv = createCanvas(w, h);//canvas creation
  strokeWeight(0.5);
  cx = 0.5 * width;
  cy = 0.427 * height
  fArray[0] = createVector(cx, cy);
}
function draw() {
  if (hatchToggle) {
    for (let i = 0; i < 10; i++) {
      //classicHatch();
      for (let j = 0; j < fArray.length; j++) {
        circleHatch(fArray[j].x, fArray[j].y)
      }
    }
    //decrease hatch size
    if (hatchSize > 5) {
      hatchSize -= 0.5;
    }
  }
}

function circleHatch(cx, cy) {
  cx, cy
  x = random(0, width);
  y = random(0, height);
  pixCol = bg.get(bg.width / (width / x), bg.height / (height / y));
  stroke(pixCol);
  r = dist(cx, cy, x, y);
  theta = atan((y - cy) / (x - cx));
  hs = min(200, chatchSize / 10);
  d = random(PI / (hs + 10), PI / (hs))
  noFill()
  if (cx >= x && cy >= y) {
    theta = theta + PI
    arc(cx, cy, r * 2, r * 2, theta - d, theta + d);
  }
  if (cx >= x && cy < y) {
    theta = theta - PI
    arc(cx, cy, r * 2, r * 2, theta - d, theta + d);
  }
  if (cx < x && cy <= y) {
    arc(cx, cy, r * 2, r * 2, theta - d, theta + d);
  }
  if (cx < x && cy > y) {
    arc(cx, cy, r * 2, r * 2, theta - d, theta + d);
  }
  chatchSize += 0.05;

}
//change the focal point
function mousePressed() {
  fArray[fArray.length] = createVector(mouseX, mouseY)
  chatchSize = 1;
}

function keyPressed() {
  hatchToggle = !hatchToggle
}

function classicHatch() {
  //random x in the canvas
  x = random(0, width);
  //random y in the canvas
  y = random(0, height);
  //get the (x,y) color for that position on the canvas
  pixCol = bg.get(bg.width / (width / x), bg.height / (height / y));
  //set stroke to pixel color
  stroke(pixCol);
  //randomizing hatch size within decreasing range
  d = random(0, hatchSize)
  line(x - d / 2, y - d / 2, x + d / 22, y + d / 2);
  //crosshatch
  //line(x-d/2,y+d/2,x-d/22,y-d/2);
}
