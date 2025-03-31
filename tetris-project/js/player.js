// player.js
import { rotate } from './utils.js';
import { createPiece, randomPieceType } from './pieces.js';

export class Player {
  constructor(arena) {
    this.arena = arena;
    this.reset();
  }

  reset() {
    this.matrix = createPiece(randomPieceType());
    this.pos = {
      x: (this.arena.matrix[0].length / 2 | 0) - (this.matrix[0].length / 2 | 0),
      y: 0
    };
    if (this.arena.collide(this)) {
      this.arena.matrix.forEach(row => row.fill(0));
      alert('ゲームオーバー');
    }
  }

  drop() {
    this.pos.y++;
    if (this.arena.collide(this)) {
      this.pos.y--;
      this.arena.merge(this);
      this.reset();
      this.arena.sweep();
    }
  }

  move(dir) {
    this.pos.x += dir;
    if (this.arena.collide(this)) {
      this.pos.x -= dir;
    }
  }

  rotate(dir) {
    const pos = this.pos.x;
    let offset = 1;
    rotate(this.matrix, dir);
    while (this.arena.collide(this)) {
      this.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > this.matrix[0].length) {
        rotate(this.matrix, -dir);
        this.pos.x = pos;
        return;
      }
    }
  }
}
