const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const coinCount = document.querySelector('#coin-count');
const restartButton = document.querySelector('#restart');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WORLD_WIDTH = 2800;
const GRAVITY = 1800;
const MOVE_SPEED = 300;
const JUMP_SPEED = 690;
const keys = new Set();

const platforms = [
    { x: 0, y: 465, width: 560, height: 100 },
    { x: 640, y: 465, width: 390, height: 100 },
    { x: 1110, y: 465, width: 430, height: 100 },
    { x: 1620, y: 465, width: 430, height: 100 },
    { x: 2130, y: 465, width: 670, height: 100 },
    { x: 235, y: 365, width: 135, height: 20 },
    { x: 735, y: 360, width: 140, height: 20 },
    { x: 1245, y: 355, width: 145, height: 20 },
    { x: 1740, y: 355, width: 145, height: 20 },
    { x: 2225, y: 360, width: 145, height: 20 },
];

const coinLocations = [
    { x: 300, y: 320 },
    { x: 800, y: 315 },
    { x: 1320, y: 310 },
    { x: 1815, y: 310 },
    { x: 2300, y: 315 },
];

let player;
let coins;
let cameraX;
let gameState;
let previousTime = 0;

function resetGame() {
    player = { x: 70, y: 400, width: 34, height: 48, velocityX: 0, velocityY: 0, grounded: false };
    coins = coinLocations.map((coin) => ({ ...coin, collected: false }));
    cameraX = 0;
    gameState = 'playing';
    coinCount.textContent = '0';
}

function roundedRect(x, y, width, height, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
}

function drawBackground() {
    const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, '#8bd8f5');
    sky.addColorStop(1, '#d5f4ff');
    context.fillStyle = sky;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    context.fillStyle = '#ffffffa6';
    for (let i = 0; i < 9; i += 1) {
        const x = ((i * 167 - cameraX * 0.22) % (WIDTH + 160) + WIDTH + 160) % (WIDTH + 160) - 80;
        const y = 85 + (i % 3) * 62;
        context.beginPath();
        context.ellipse(x, y, 38, 13, 0, 0, Math.PI * 2);
        context.ellipse(x + 24, y - 8, 24, 18, 0, 0, Math.PI * 2);
        context.ellipse(x + 48, y, 35, 12, 0, 0, Math.PI * 2);
        context.fill();
    }

    context.fillStyle = '#87d6b2';
    context.beginPath();
    context.moveTo(0, 425);
    for (let x = 0; x <= WIDTH + 60; x += 60) {
        const worldX = x + cameraX * 0.38;
        context.lineTo(x, 385 + Math.sin(worldX / 140) * 20);
    }
    context.lineTo(WIDTH, HEIGHT);
    context.lineTo(0, HEIGHT);
    context.fill();
}

function drawWorld() {
    context.save();
    context.translate(-cameraX, 0);

    for (const platform of platforms) {
        roundedRect(platform.x, platform.y, platform.width, platform.height, 10, '#9b654a');
        if (platform.height > 30) {
            roundedRect(platform.x, platform.y, platform.width, 18, 8, '#70c765');
            context.fillStyle = '#91df75';
            context.fillRect(platform.x + 4, platform.y + 14, platform.width - 8, 5);
        } else {
            roundedRect(platform.x, platform.y, platform.width, 9, 5, '#70c765');
        }
    }

    drawGoal();
    for (const coin of coins) {
        if (coin.collected) continue;
        context.fillStyle = '#f7b92f';
        context.beginPath();
        context.arc(coin.x, coin.y + Math.sin(performance.now() / 180 + coin.x) * 4, 12, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#ffe27a';
        context.lineWidth = 3;
        context.stroke();
        context.fillStyle = '#fff4bb';
        context.fillRect(coin.x - 2, coin.y - 6, 4, 12);
    }

    drawPlayer();
    context.restore();
}

function drawGoal() {
    const x = WORLD_WIDTH - 115;
    context.fillStyle = '#fff';
    context.fillRect(x, 332, 7, 133);
    context.fillStyle = '#ff7380';
    context.beginPath();
    context.moveTo(x + 7, 334);
    context.lineTo(x + 64, 351);
    context.lineTo(x + 7, 369);
    context.closePath();
    context.fill();
    context.fillStyle = '#ffe27a';
    context.beginPath();
    context.arc(x + 3, 328, 8, 0, Math.PI * 2);
    context.fill();
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    roundedRect(x + 2, y + 9, player.width - 4, player.height - 9, 11, '#f7a14b');
    roundedRect(x + 3, y + 4, player.width - 6, 24, 10, '#ffd2a0');
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(x + 12, y + 19, 4, 0, Math.PI * 2);
    context.arc(x + 23, y + 19, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#294c63';
    context.beginPath();
    context.arc(x + 13, y + 20, 2, 0, Math.PI * 2);
    context.arc(x + 24, y + 20, 2, 0, Math.PI * 2);
    context.fill();
    roundedRect(x + 7, y + 38, 9, 10, 4, '#566fd6');
    roundedRect(x + 19, y + 38, 9, 10, 4, '#566fd6');
}

function update(delta) {
    if (gameState !== 'playing') return;

    const movingLeft = keys.has('ArrowLeft') || keys.has('KeyA');
    const movingRight = keys.has('ArrowRight') || keys.has('KeyD');
    player.velocityX = Number(movingRight) - Number(movingLeft);
    player.velocityX *= MOVE_SPEED;

    if ((keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')) && player.grounded) {
        player.velocityY = -JUMP_SPEED;
        player.grounded = false;
    }

    const previousBottom = player.y + player.height;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.velocityX * delta));
    player.velocityY = Math.min(player.velocityY + GRAVITY * delta, 1000);
    player.y += player.velocityY * delta;
    player.grounded = false;

    for (const platform of platforms) {
        const overlapsX = player.x + player.width > platform.x && player.x < platform.x + platform.width;
        const crossedTop = previousBottom <= platform.y && player.y + player.height >= platform.y;
        if (overlapsX && crossedTop && player.velocityY >= 0) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.grounded = true;
        }
    }

    for (const coin of coins) {
        const overlaps = Math.abs(player.x + player.width / 2 - coin.x) < 25
            && Math.abs(player.y + player.height / 2 - coin.y) < 32;
        if (!coin.collected && overlaps) {
            coin.collected = true;
            coinCount.textContent = String(coins.filter((item) => item.collected).length);
        }
    }

    if (player.y > HEIGHT + 100) {
        resetGame();
    }

    cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * 0.35));
    if (player.x + player.width >= WORLD_WIDTH - 115) {
        gameState = 'won';
    }
}

function drawMessage(title, subtitle) {
    context.fillStyle = '#16384f99';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    roundedRect(WIDTH / 2 - 205, HEIGHT / 2 - 82, 410, 164, 22, '#ffffffed');
    context.fillStyle = '#244c60';
    context.textAlign = 'center';
    context.font = '900 34px "Noto Sans JP", sans-serif';
    context.fillText(title, WIDTH / 2, HEIGHT / 2 - 12);
    context.font = '700 16px "Noto Sans JP", sans-serif';
    context.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 28);
    context.textAlign = 'start';
}

function render() {
    drawBackground();
    drawWorld();
    if (gameState === 'won') {
        drawMessage('ゴール！', `コイン ${coins.filter((coin) => coin.collected).length} / ${coins.length} 枚ゲット`);
    }
}

function gameLoop(time) {
    const delta = Math.min((time - previousTime) / 1000 || 0, 1 / 30);
    previousTime = time;
    update(delta);
    render();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
    const key = event.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(key)) event.preventDefault();
    keys.add(key);
});

window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
restartButton.addEventListener('click', resetGame);

document.querySelectorAll('.touch-controls button').forEach((button) => {
    const key = button.dataset.key;
    button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        keys.add(key);
        button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', () => keys.delete(key));
    button.addEventListener('pointercancel', () => keys.delete(key));
    button.addEventListener('lostpointercapture', () => keys.delete(key));
});

resetGame();
requestAnimationFrame(gameLoop);
