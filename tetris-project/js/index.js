// input.js

// キーボード操作を登録する関数
export function setupInput(player) {
  document.addEventListener('keydown', event => {
    switch (event.key) {
      case 'ArrowLeft':
        player.move(-1);
        break;
      case 'ArrowRight':
        player.move(1);
        break;
      case 'ArrowDown':
        player.drop();
        break;
      case 'q':
        player.rotate(-1);
        break;
      case 'w':
        player.rotate(1);
        break;
    }
  });
}
