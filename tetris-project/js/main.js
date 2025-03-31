// main.js
console.log("main.js 読み込まれました！");

import { Arena } from './arena.js';
import { Player } from './player.js';
import { setupInput } from './input.js';

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const arena = new Arena(12, 20);
const player = new Player(arena);
setupInput(player);

const colors = [
  null,
  'purple',  // T
  'yellow',  // O
  'orange',  // L
  'blue',    // J
  'cyan',    // I
  'green',   // S
  'red'      // Z
];

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena.matrix, {x: 0, y: 0});
  drawMatrix(player.matrix, player.pos);
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;

  if (dropCounter > dropInterval) {
    player.drop();
    dropCounter = 0;
  }

  draw();
  requestAnimationFrame(update);
}

update();
