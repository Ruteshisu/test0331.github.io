// utils.js

// 行列を回転させる（時計回り or 反時計回り）
export function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

// 指定サイズの空の行列（盤面）を作成
export function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}
