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
    sky.addColorStop(0, '#171b3f');
    sky.addColorStop(0.58, '#51406b');
    sky.addColorStop(1, '#d87879');
    context.fillStyle = sky;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 42; i += 1) {
        const x = (i * 193 + 31) % WIDTH;
        const y = (i * 79 + 23) % 225;
        context.fillStyle = i % 4 === 0 ? '#ffd27a' : '#fff1ca';
        context.fillRect(x, y, i % 5 === 0 ? 4 : 2, i % 5 === 0 ? 4 : 2);
    }

    const sunX = 760 - cameraX * 0.08;
    context.fillStyle = '#f3a66b';
    context.fillRect(sunX, 174, 72, 72);
    context.fillStyle = '#d87879';
    context.fillRect(sunX, 222, 72, 6);
    context.fillRect(sunX + 8, 234, 56, 5);
    context.fillRect(sunX + 16, 245, 40, 4);

    context.fillStyle = '#403957';
    context.beginPath();
    context.moveTo(0, 410);
    for (let i = 0; i < 9; i += 1) {
        const x = i * 150 - ((cameraX * 0.2) % 150);
        context.lineTo(x, 410);
        context.lineTo(x + 75, 305 + (i % 3) * 24);
        context.lineTo(x + 150, 410);
    }
    context.lineTo(WIDTH, HEIGHT);
    context.lineTo(0, HEIGHT);
    context.fill();

    context.fillStyle = '#302d4b';
    const cityScroll = cameraX * 0.34;
    for (let i = 0; i < 12; i += 1) {
        const x = i * 94 - (cityScroll % 94);
        const height = 52 + ((i * 37) % 75);
        context.fillRect(x, 430 - height, 66, height);
        context.fillStyle = '#e8a36d';
        for (let row = 0; row < Math.floor(height / 18); row += 1) {
            if ((i + row) % 2 === 0) context.fillRect(x + 13, 438 - height + row * 18, 6, 7);
            if ((i + row) % 3 !== 0) context.fillRect(x + 39, 438 - height + row * 18, 6, 7);
        }
        context.fillStyle = '#302d4b';
    }
}

function drawWorld() {
    context.save();
    context.translate(-cameraX, 0);

    for (const platform of platforms) {
        context.fillStyle = '#49345c';
        context.fillRect(platform.x, platform.y, platform.width, platform.height);
        if (platform.height > 30) {
            context.fillStyle = '#55c7a5';
            context.fillRect(platform.x, platform.y, platform.width, 12);
            context.fillStyle = '#a4e6a0';
            context.fillRect(platform.x, platform.y, platform.width, 4);
        } else {
            context.fillStyle = '#55c7a5';
            context.fillRect(platform.x, platform.y, platform.width, 7);
            context.fillStyle = '#a4e6a0';
            context.fillRect(platform.x, platform.y, platform.width, 3);
        }
        context.fillStyle = '#735273';
        for (let x = platform.x + 24; x < platform.x + platform.width; x += 32) {
            context.fillRect(x, platform.y + 16, 2, Math.max(0, platform.height - 16));
        }
    }

    drawGoal();
    for (const coin of coins) {
        if (coin.collected) continue;
        const coinY = coin.y + Math.sin(performance.now() / 180 + coin.x) * 4;
        context.fillStyle = '#c77836';
        context.fillRect(coin.x - 9, coinY - 11, 18, 22);
        context.fillStyle = '#ffd166';
        context.fillRect(coin.x - 6, coinY - 11, 12, 18);
        context.fillStyle = '#fff1a8';
        context.fillRect(coin.x - 2, coinY - 7, 4, 12);
    }

    drawPlayer();
    context.restore();
}

function drawGoal() {
    const x = WORLD_WIDTH - 115;
    context.fillStyle = '#f3d7a0';
    context.fillRect(x, 332, 6, 133);
    context.fillStyle = '#f3a66b';
    context.fillRect(x + 6, 336, 44, 9);
    context.fillRect(x + 6, 345, 34, 9);
    context.fillRect(x + 6, 354, 24, 9);
    context.fillStyle = '#ffd166';
    context.fillRect(x - 4, 326, 14, 6);
    context.fillRect(x, 322, 6, 14);
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    context.fillStyle = '#9b4e45';
    context.fillRect(x + 2, y + 11, 30, 35);
    context.fillStyle = '#f3a66b';
    context.fillRect(x + 4, y + 5, 26, 23);
    context.fillStyle = '#fff1ca';
    context.fillRect(x + 8, y + 15, 6, 7);
    context.fillRect(x + 21, y + 15, 6, 7);
    context.fillStyle = '#302d4b';
    context.fillRect(x + 10, y + 17, 3, 4);
    context.fillRect(x + 23, y + 17, 3, 4);
    context.fillStyle = '#55c7a5';
    context.fillRect(x + 5, y + 36, 10, 12);
    context.fillRect(x + 19, y + 36, 10, 12);
    context.fillStyle = '#a4e6a0';
    context.fillRect(x + 5, y + 36, 10, 3);
    context.fillRect(x + 19, y + 36, 10, 3);
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
    context.fillStyle = '#171b3fc9';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = '#302d4b';
    context.fillRect(WIDTH / 2 - 205, HEIGHT / 2 - 82, 410, 164);
    context.strokeStyle = '#ffd166';
    context.lineWidth = 4;
    context.strokeRect(WIDTH / 2 - 205, HEIGHT / 2 - 82, 410, 164);
    context.fillStyle = '#fff1ca';
    context.textAlign = 'center';
    context.font = '900 34px "Noto Sans JP", sans-serif';
    context.fillText(title, WIDTH / 2, HEIGHT / 2 - 12);
    context.fillStyle = '#f3a66b';
    context.font = '700 16px "Noto Sans JP", sans-serif';
    context.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 28);
    context.textAlign = 'start';
}

function render() {
    drawBackground();
    drawWorld();
    context.fillStyle = '#171b3f12';
    for (let y = 0; y < HEIGHT; y += 4) {
        context.fillRect(0, y, WIDTH, 1);
    }
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
