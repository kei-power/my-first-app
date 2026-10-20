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
    sky.addColorStop(0, '#08091f');
    sky.addColorStop(0.62, '#15143b');
    sky.addColorStop(1, '#35143f');
    context.fillStyle = sky;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 48; i += 1) {
        const x = (i * 197 + 43) % WIDTH;
        const y = (i * 83 + 29) % 260;
        context.fillStyle = i % 4 === 0 ? '#ff58dc' : '#8eefff';
        context.globalAlpha = 0.35 + (i % 3) * 0.18;
        context.fillRect(x, y, i % 5 === 0 ? 3 : 2, 2);
    }
    context.globalAlpha = 1;

    const drawCityLayer = (parallax, baseY, color, windowColor, offset) => {
        const scroll = cameraX * parallax;
        const firstBuilding = Math.floor(scroll / 132) - 1;
        context.save();
        context.translate(-scroll, 0);
        for (let i = firstBuilding; i < firstBuilding + 11; i += 1) {
            const x = i * 132 + offset;
            const height = 95 + ((i * 47 % 125) + 125) % 125;
            const width = 90 + ((i * 19 % 30) + 30) % 30;
            context.fillStyle = color;
            context.fillRect(x, baseY - height, width, height);
            context.fillStyle = windowColor;
            context.globalAlpha = 0.65;
            for (let row = 0; row < Math.floor(height / 22); row += 1) {
                for (let column = 0; column < 3; column += 1) {
                    if ((i + row + column) % 3 !== 0) {
                        context.fillRect(x + 13 + column * 23, baseY - height + 15 + row * 22, 5, 9);
                    }
                }
            }
            context.globalAlpha = 1;
        }
        context.restore();
    };

    drawCityLayer(0.16, 420, '#171b43', '#fa4fca', 0);
    drawCityLayer(0.32, 450, '#10152f', '#00eaff', 38);

    context.fillStyle = '#11142e';
    context.beginPath();
    context.moveTo(0, 425);
    for (let x = 0; x <= WIDTH + 60; x += 60) {
        const worldX = x + cameraX * 0.38;
        context.lineTo(x, 430 + Math.sin(worldX / 140) * 12);
    }
    context.lineTo(WIDTH, HEIGHT);
    context.lineTo(0, HEIGHT);
    context.fill();

    context.save();
    context.strokeStyle = '#8b35c7';
    context.globalAlpha = 0.38;
    context.lineWidth = 1;
    for (let x = -((cameraX * 0.55) % 80); x < WIDTH; x += 80) {
        context.beginPath();
        context.moveTo(WIDTH / 2 + (x - WIDTH / 2) * 0.15, 430);
        context.lineTo(x, HEIGHT);
        context.stroke();
    }
    for (let y = 448; y < HEIGHT; y += 20) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(WIDTH, y);
        context.stroke();
    }
    context.restore();
}

function drawWorld() {
    context.save();
    context.translate(-cameraX, 0);

    for (const platform of platforms) {
        context.save();
        context.shadowColor = '#00eaff';
        context.shadowBlur = 15;
        roundedRect(platform.x, platform.y, platform.width, platform.height, 8, '#171a35');
        context.shadowBlur = 0;
        context.strokeStyle = '#00dff5';
        context.lineWidth = 2;
        context.strokeRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
        if (platform.height > 30) {
            context.fillStyle = '#ff38d1';
            context.shadowColor = '#ff38d1';
            context.shadowBlur = 12;
            context.fillRect(platform.x + 4, platform.y, platform.width - 8, 5);
        } else {
            roundedRect(platform.x, platform.y, platform.width, 8, 4, '#ff38d1');
        }
        context.restore();
    }

    drawGoal();
    for (const coin of coins) {
        if (coin.collected) continue;
        const coinY = coin.y + Math.sin(performance.now() / 180 + coin.x) * 4;
        context.save();
        context.shadowColor = '#ffe45c';
        context.shadowBlur = 18;
        context.fillStyle = '#ffe45c';
        context.beginPath();
        context.arc(coin.x, coinY, 12, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#fff6b0';
        context.lineWidth = 3;
        context.stroke();
        context.fillStyle = '#fff9d8';
        context.fillRect(coin.x - 2, coinY - 6, 4, 12);
        context.restore();
    }

    drawPlayer();
    context.restore();
}

function drawGoal() {
    const x = WORLD_WIDTH - 115;
    context.save();
    context.shadowColor = '#ff38d1';
    context.shadowBlur = 24;
    context.strokeStyle = '#ff38d1';
    context.lineWidth = 6;
    context.beginPath();
    context.roundRect(x - 25, 325, 70, 140, 30);
    context.stroke();
    context.shadowColor = '#00eaff';
    context.strokeStyle = '#00eaff';
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(x - 15, 337, 50, 128, 24);
    context.stroke();
    context.fillStyle = '#00eaff';
    context.globalAlpha = 0.16;
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(x + 10, 323, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    context.save();
    context.shadowColor = '#00eaff';
    context.shadowBlur = 17;
    roundedRect(x + 2, y + 9, player.width - 4, player.height - 9, 11, '#00cfe8');
    roundedRect(x + 3, y + 4, player.width - 6, 24, 10, '#b8fbff');
    context.shadowBlur = 0;
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(x + 12, y + 19, 4, 0, Math.PI * 2);
    context.arc(x + 23, y + 19, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#172044';
    context.beginPath();
    context.arc(x + 13, y + 20, 2, 0, Math.PI * 2);
    context.arc(x + 24, y + 20, 2, 0, Math.PI * 2);
    context.fill();
    roundedRect(x + 7, y + 38, 9, 10, 4, '#ff38d1');
    roundedRect(x + 19, y + 38, 9, 10, 4, '#ff38d1');
    context.restore();
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
    context.fillStyle = '#050616c9';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.save();
    context.shadowColor = '#00eaff';
    context.shadowBlur = 24;
    roundedRect(WIDTH / 2 - 205, HEIGHT / 2 - 82, 410, 164, 22, '#11152ff5');
    context.strokeStyle = '#00eaff';
    context.lineWidth = 2;
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = '#b8fbff';
    context.textAlign = 'center';
    context.font = '900 34px "Noto Sans JP", sans-serif';
    context.fillText(title, WIDTH / 2, HEIGHT / 2 - 12);
    context.font = '700 16px "Noto Sans JP", sans-serif';
    context.fillStyle = '#ff8de7';
    context.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 28);
    context.textAlign = 'start';
    context.restore();
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
