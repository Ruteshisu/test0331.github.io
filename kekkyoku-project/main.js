window.onload = () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const skyHeight = 200;

  const cloudImage = new Image();
  cloudImage.src = "cloud.png";
  const clouds = [
    { x: 50, y: 30, speed: 0.3 },
    { x: 200, y: 60, speed: 0.2 },
    { x: 300, y: 40, speed: 0.4 }
  ];

  const walkFrames = ["char_walk1.png", "char_walk2.png"].map(src => {
    const img = new Image();
    img.src = src;
    return img;
  });

  const jumpImg = new Image();
  jumpImg.src = "char_jump.png";

  const holeImg = new Image();
  holeImg.src = "hole.png";

  const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 80,
    width: 40,
    height: 60,
    vy: 0,
    onGround: true,
    jumping: false,
    jumpTimer: 0,
    frameIndex: 0,
    frameTimer: 0
  };

  const GRAVITY = 0.2;
  const JUMP_ASCEND_DURATION = 20;
  const JUMP_HOVER_DURATION = 60;

  const keys = {};

  const obstacles = [];
  const items = [];
  let score = 0;

  const topY = skyHeight;
  const bottomY = canvas.height;
  const topWidth = canvas.width - 120;
  const bottomWidth = canvas.width;

  function computeXOnTrapezoid(baseRatio, y, objectWidth) {
    const t = (y - topY) / (bottomY - topY);
    const laneWidth = topWidth + (bottomWidth - topWidth) * t;
    const left = (canvas.width - laneWidth) / 2;
    const x = left + baseRatio * (laneWidth - objectWidth);
    return x;
  }

  function computeScale(y) {
    const t = (y - topY) / (bottomY - topY);
    return topWidth / bottomWidth + (1 - topWidth / bottomWidth) * t;
  }

  function drawBackground() {
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, canvas.width, skyHeight);

    clouds.forEach(cloud => {
      if (cloudImage.complete) {
        ctx.drawImage(cloudImage, cloud.x, cloud.y, 60, 30);
      }
      cloud.x -= cloud.speed;
      if (cloud.x + 60 < 0) cloud.x = canvas.width;
    });

    ctx.fillStyle = "#ddeeff";
    ctx.beginPath();
    ctx.moveTo(60, skyHeight);
    ctx.lineTo(canvas.width - 60, skyHeight);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1e90ff";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(60, skyHeight);
    ctx.lineTo(0, skyHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f0f8ff";
    ctx.beginPath();
    ctx.moveTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width - 60, skyHeight);
    ctx.lineTo(canvas.width, skyHeight);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlayer() {
    const img = player.jumping ? jumpImg : walkFrames[player.frameIndex];
    if (img.complete) {
      ctx.drawImage(img, player.x, player.y, player.width, player.height);
    }
  }

  function updatePlayer() {
    if (keys["ArrowLeft"]) player.x -= 4;
    if (keys["ArrowRight"]) player.x += 4;

    if (player.jumping) {
      player.jumpTimer++;
      if (player.jumpTimer < JUMP_ASCEND_DURATION) {
        player.vy = -5;
      } else if (player.jumpTimer < JUMP_ASCEND_DURATION + JUMP_HOVER_DURATION) {
        player.vy = 0;
      } else {
        player.jumping = false;
      }
    }

    player.vy += GRAVITY;
    player.y += player.vy;

    if (player.y >= canvas.height - 80) {
      player.y = canvas.height - 80;
      player.vy = 0;
      player.onGround = true;
      player.jumping = false;
      player.jumpTimer = 0;
    } else {
      player.onGround = false;
    }

    if (!player.jumping) {
      player.frameTimer++;
      if (player.frameTimer > 10) {
        player.frameTimer = 0;
        player.frameIndex = (player.frameIndex + 1) % walkFrames.length;
      }
    }
  }

  function drawObstacles() {
    obstacles.forEach(obs => {
      const scale = computeScale(obs.y);
      const width = obs.baseWidth * scale;
      const height = obs.baseHeight * scale;
      const x = computeXOnTrapezoid(obs.baseRatio, obs.y, width);
      if (holeImg.complete) {
        ctx.drawImage(holeImg, x, obs.y, width, height);
      }
      obs.x = x;
      obs.width = width;
      obs.height = height;
    });
  }

  function drawItems() {
    ctx.fillStyle = "gold";
    items.forEach(item => {
      const scale = computeScale(item.y);
      const size = item.baseSize * scale;
      const x = computeXOnTrapezoid(item.baseRatio, item.y, size);
      ctx.beginPath();
      ctx.arc(x + size / 2, item.y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      item.x = x;
      item.size = size;
    });
  }

  function updateObjects() {
    obstacles.forEach(o => o.y += 2);
    items.forEach(i => i.y += 2);

    obstacles.forEach(o => {
      if (!player.jumping &&
          player.x < o.x + o.width &&
          player.x + player.width > o.x &&
          player.y < o.y + o.height &&
          player.y + player.height > o.y) {
        o.y = canvas.height + 1;
      }
    });

    items.forEach(i => {
      if (player.x < i.x + i.size &&
          player.x + player.width > i.x &&
          player.y < i.y + i.size &&
          player.y + player.height > i.y) {
        i.y = canvas.height + 1;
        score += 10;
      }
    });
  }

  function drawScore() {
    ctx.fillStyle = "black";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Score: ${score}`, 10, 20);
  }

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    updatePlayer();
    updateObjects();
    drawObstacles();
    drawItems();
    drawPlayer();
    drawScore();
    requestAnimationFrame(gameLoop);
  }

  setInterval(() => {
    obstacles.push({
      baseRatio: Math.random(),
      y: skyHeight,
      baseWidth: 40,
      baseHeight: 20
    });
  }, 2000);

  setInterval(() => {
    items.push({
      baseRatio: Math.random(),
      y: skyHeight,
      baseSize: 15
    });
  }, 2500);

  document.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (e.key === " " && player.onGround) {
      player.jumping = true;
      player.jumpTimer = 0;
    }
  });

  document.addEventListener("keyup", e => {
    keys[e.key] = false;
  });

  gameLoop();
};
