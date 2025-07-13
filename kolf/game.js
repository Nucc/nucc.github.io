class Ball {
    constructor(x, y) {
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };
        this.radius = 8;
        this.color = '#ffffff';
        this.friction = 0.98;
        this.lastSafePosition = { x, y };
    }
    updateSafePosition() {
        this.lastSafePosition = { x: this.position.x, y: this.position.y };
    }
    update(deltaTime) {
        const timeStep = deltaTime / 1000;
        this.position.x += this.velocity.x * timeStep;
        this.position.y += this.velocity.y * timeStep;
        this.velocity.x *= Math.pow(this.friction, timeStep * 60);
        this.velocity.y *= Math.pow(this.friction, timeStep * 60);
        if (Math.abs(this.velocity.x) < 0.1)
            this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.1)
            this.velocity.y = 0;
    }
    isMoving() {
        return Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1;
    }
    stop() {
        this.velocity.x = 0;
        this.velocity.y = 0;
    }
}
class Hole {
    constructor(x, y) {
        this.position = { x, y };
        this.radius = 15;
        this.color = '#000000';
    }
}
class Wall {
    constructor(x1, y1, x2, y2) {
        this.start = { x: x1, y: y1 };
        this.end = { x: x2, y: y2 };
        this.thickness = 10;
        this.color = '#8B4513';
    }
}
class KolfGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tracks = this.createTracks();
        this.currentTrackIndex = 0;
        this.currentTrack = this.tracks[0];
        this.ball = new Ball(this.currentTrack.ballStart.x, this.currentTrack.ballStart.y);
        this.hole = new Hole(this.currentTrack.hole.x, this.currentTrack.hole.y);
        this.aimDirection = 0;
        this.powerLevel = 0;
        this.isChargingPower = false;
        this.powerChargeSpeed = 2;
        this.lastTime = 0;
        this.gameState = 'aiming';
        this.strokeCount = 0;
        this.setupEventListeners();
        this.gameLoop(0);
    }
    createTracks() {
        return [
            // Track 1: Simple course
            {
                name: "Beginner",
                ballStart: { x: 100, y: 300 },
                hole: { x: 650, y: 300 },
                walls: [
                    new Wall(50, 50, 750, 50),
                    new Wall(750, 50, 750, 550),
                    new Wall(750, 550, 50, 550),
                    new Wall(50, 550, 50, 50),
                    new Wall(200, 150, 400, 150),
                    new Wall(500, 200, 600, 350),
                    new Wall(300, 400, 500, 450)
                ],
                lakes: [],
                slopes: []
            },
            // Track 2: Water hazards
            {
                name: "Lake Challenge",
                ballStart: { x: 100, y: 500 },
                hole: { x: 650, y: 100 },
                walls: [
                    new Wall(50, 50, 750, 50),
                    new Wall(750, 50, 750, 550),
                    new Wall(750, 550, 50, 550),
                    new Wall(50, 550, 50, 50),
                    new Wall(150, 150, 350, 180),
                    new Wall(450, 200, 650, 230),
                    new Wall(200, 350, 600, 380)
                ],
                lakes: [
                    { position: { x: 250, y: 250 }, width: 120, height: 80, color: '#4682B4' },
                    { position: { x: 450, y: 400 }, width: 100, height: 60, color: '#4682B4' },
                    { position: { x: 150, y: 400 }, width: 80, height: 60, color: '#4682B4' }
                ],
                slopes: []
            },
            // Track 3: Slopes and hills
            {
                name: "Mountain Course",
                ballStart: { x: 80, y: 450 },
                hole: { x: 680, y: 150 },
                walls: [
                    new Wall(50, 50, 750, 50),
                    new Wall(750, 50, 750, 550),
                    new Wall(750, 550, 50, 550),
                    new Wall(50, 550, 50, 50),
                    new Wall(200, 250, 400, 200),
                    new Wall(500, 300, 650, 250)
                ],
                lakes: [],
                slopes: [
                    { start: { x: 150, y: 400 }, end: { x: 250, y: 300 }, steepness: 0.2, direction: { x: 1, y: -1 } },
                    { start: { x: 400, y: 350 }, end: { x: 500, y: 250 }, steepness: 0.4, direction: { x: 1, y: -1 } },
                    { start: { x: 300, y: 500 }, end: { x: 400, y: 400 }, steepness: 0.1, direction: { x: 1, y: -1 } }
                ]
            },
            // Track 4: Complex course with everything
            {
                name: "Championship",
                ballStart: { x: 80, y: 280 },
                hole: { x: 680, y: 450 },
                walls: [
                    new Wall(50, 50, 750, 50),
                    new Wall(750, 50, 750, 550),
                    new Wall(750, 550, 50, 550),
                    new Wall(50, 550, 50, 50),
                    new Wall(180, 150, 300, 120),
                    new Wall(400, 180, 550, 150),
                    new Wall(200, 350, 350, 320),
                    new Wall(500, 350, 650, 380),
                    new Wall(150, 200, 150, 300),
                    new Wall(600, 200, 600, 320)
                ],
                lakes: [
                    { position: { x: 350, y: 200 }, width: 100, height: 70, color: '#4682B4' },
                    { position: { x: 250, y: 420 }, width: 80, height: 50, color: '#4682B4' }
                ],
                slopes: [
                    { start: { x: 300, y: 300 }, end: { x: 400, y: 250 }, steepness: 0.3, direction: { x: 1, y: -0.5 } },
                    { start: { x: 450, y: 400 }, end: { x: 550, y: 350 }, steepness: 0.5, direction: { x: 1, y: -0.5 } }
                ]
            }
        ];
    }
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'aiming') {
                if (e.code === 'ArrowLeft') {
                    this.aimDirection -= 0.1;
                }
                else if (e.code === 'ArrowRight') {
                    this.aimDirection += 0.1;
                }
                else if (e.code === 'Space') {
                    e.preventDefault();
                    if (!this.isChargingPower) {
                        this.isChargingPower = true;
                        this.powerLevel = 0;
                    }
                }
                else if (e.code === 'KeyT') {
                    this.gameState = 'trackSelect';
                }
            }
            else if (this.gameState === 'completed') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.resetGame();
                }
                else if (e.code === 'KeyT') {
                    this.gameState = 'trackSelect';
                }
            }
            else if (this.gameState === 'trackSelect') {
                if (e.code === 'Digit1') {
                    this.selectTrack(0);
                }
                else if (e.code === 'Digit2') {
                    this.selectTrack(1);
                }
                else if (e.code === 'Digit3') {
                    this.selectTrack(2);
                }
                else if (e.code === 'Digit4') {
                    this.selectTrack(3);
                }
                else if (e.code === 'Escape') {
                    this.gameState = 'aiming';
                }
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.isChargingPower && this.gameState === 'aiming') {
                e.preventDefault();
                this.shootBall();
            }
        });
    }
    selectTrack(index) {
        if (index >= 0 && index < this.tracks.length) {
            this.currentTrackIndex = index;
            this.currentTrack = this.tracks[index];
            this.resetGame();
        }
    }
    shootBall() {
        if (this.powerLevel > 0) {
            const power = this.powerLevel * 2400;
            this.ball.velocity.x = Math.cos(this.aimDirection) * power;
            this.ball.velocity.y = Math.sin(this.aimDirection) * power;
            this.ball.updateSafePosition();
            this.isChargingPower = false;
            this.powerLevel = 0;
            this.gameState = 'ballMoving';
            this.strokeCount++;
            this.updatePowerMeter();
        }
    }
    updatePowerMeter() {
        const powerBar = document.getElementById('power-bar');
        powerBar.style.width = `${Math.min(this.powerLevel * 100, 100)}%`;
    }
    checkCollisions() {
        for (const wall of this.currentTrack.walls) {
            this.checkWallCollision(wall);
        }
        this.checkBoundaryCollisions();
        this.checkLakeCollisions();
        this.checkSlopeEffects();
        this.checkHoleCollision();
    }
    checkWallCollision(wall) {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0)
            return;
        const unitX = dx / length;
        const unitY = dy / length;
        const normalX = -unitY;
        const normalY = unitX;
        const ballToStart = {
            x: this.ball.position.x - wall.start.x,
            y: this.ball.position.y - wall.start.y
        };
        const projection = ballToStart.x * unitX + ballToStart.y * unitY;
        const clampedProjection = Math.max(0, Math.min(length, projection));
        const closestPoint = {
            x: wall.start.x + clampedProjection * unitX,
            y: wall.start.y + clampedProjection * unitY
        };
        const distanceVec = {
            x: this.ball.position.x - closestPoint.x,
            y: this.ball.position.y - closestPoint.y
        };
        const distance = Math.sqrt(distanceVec.x * distanceVec.x + distanceVec.y * distanceVec.y);
        const minDistance = this.ball.radius + wall.thickness / 2;
        if (distance < minDistance && distance > 0) {
            const overlap = minDistance - distance;
            const normalizedX = distanceVec.x / distance;
            const normalizedY = distanceVec.y / distance;
            this.ball.position.x += normalizedX * overlap;
            this.ball.position.y += normalizedY * overlap;
            const velocityDotNormal = this.ball.velocity.x * normalizedX + this.ball.velocity.y * normalizedY;
            if (velocityDotNormal < 0) {
                this.ball.velocity.x -= 2 * velocityDotNormal * normalizedX * 0.8;
                this.ball.velocity.y -= 2 * velocityDotNormal * normalizedY * 0.8;
            }
        }
    }
    checkBoundaryCollisions() {
        if (this.ball.position.x - this.ball.radius < 0) {
            this.ball.position.x = this.ball.radius;
            this.ball.velocity.x *= -0.8;
        }
        if (this.ball.position.x + this.ball.radius > this.canvas.width) {
            this.ball.position.x = this.canvas.width - this.ball.radius;
            this.ball.velocity.x *= -0.8;
        }
        if (this.ball.position.y - this.ball.radius < 0) {
            this.ball.position.y = this.ball.radius;
            this.ball.velocity.y *= -0.8;
        }
        if (this.ball.position.y + this.ball.radius > this.canvas.height) {
            this.ball.position.y = this.canvas.height - this.ball.radius;
            this.ball.velocity.y *= -0.8;
        }
    }
    checkLakeCollisions() {
        for (const lake of this.currentTrack.lakes) {
            if (this.ball.position.x > lake.position.x &&
                this.ball.position.x < lake.position.x + lake.width &&
                this.ball.position.y > lake.position.y &&
                this.ball.position.y < lake.position.y + lake.height) {
                this.ball.position.x = this.ball.lastSafePosition.x;
                this.ball.position.y = this.ball.lastSafePosition.y;
                this.ball.stop();
                console.log('Ball fell in water! Reset to last safe position');
            }
        }
    }
    checkSlopeEffects() {
        for (const slope of this.currentTrack.slopes) {
            const ballX = this.ball.position.x;
            const ballY = this.ball.position.y;
            const minX = Math.min(slope.start.x, slope.end.x) - 50;
            const maxX = Math.max(slope.start.x, slope.end.x) + 50;
            const minY = Math.min(slope.start.y, slope.end.y) - 50;
            const maxY = Math.max(slope.start.y, slope.end.y) + 50;
            if (ballX >= minX && ballX <= maxX && ballY >= minY && ballY <= maxY) {
                this.ball.velocity.x += slope.direction.x * slope.steepness * 10;
                this.ball.velocity.y += slope.direction.y * slope.steepness * 10;
            }
        }
    }
    checkHoleCollision() {
        const distance = Math.sqrt(Math.pow(this.ball.position.x - this.hole.position.x, 2) +
            Math.pow(this.ball.position.y - this.hole.position.y, 2));
        if (distance < 50) {
            console.log('Ball near hole! Distance:', distance, 'Required:', this.hole.radius + this.ball.radius);
        }
        if (distance < this.hole.radius + this.ball.radius) {
            this.ball.position.x = this.hole.position.x;
            this.ball.position.y = this.hole.position.y;
            this.ball.stop();
            this.gameState = 'completed';
            console.log('HOLE COMPLETED! Strokes:', this.strokeCount);
        }
    }
    update(deltaTime) {
        if (this.isChargingPower) {
            this.powerLevel += this.powerChargeSpeed * deltaTime / 1000;
            if (this.powerLevel > 1) {
                this.powerLevel = 1;
            }
            this.updatePowerMeter();
        }
        if (this.gameState === 'ballMoving') {
            const maxSubSteps = 4;
            const subDeltaTime = deltaTime / maxSubSteps;
            for (let i = 0; i < maxSubSteps; i++) {
                this.ball.update(subDeltaTime);
                this.checkCollisions();
            }
            if (!this.ball.isMoving()) {
                this.gameState = 'aiming';
            }
        }
        if (this.gameState !== 'completed') {
            this.checkHoleCollision();
        }
    }
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderSlopes();
        this.renderLakes();
        this.renderWalls();
        this.renderHole();
        this.renderBall();
        if (this.gameState === 'aiming') {
            this.renderAimLine();
        }
        this.renderUI();
    }
    renderSlopes() {
        for (const slope of this.currentTrack.slopes) {
            const width = 100;
            const height = 80;
            const slopeX = Math.min(slope.start.x, slope.end.x) - 25;
            const slopeY = Math.min(slope.start.y, slope.end.y) - 25;
            // Draw slope background - always sandy color
            this.ctx.fillStyle = '#CD853F';
            this.ctx.fillRect(slopeX, slopeY, width, height);
            // Draw slope border
            this.ctx.strokeStyle = '#8B7355';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(slopeX, slopeY, width, height);
            // Calculate steepness level (1-5)
            const steepnessLevel = Math.round(slope.steepness * 10); // Convert 0.2-0.4 to 2-4, etc.
            const displayLevel = Math.max(1, Math.min(5, steepnessLevel));
            // Draw direction arrow
            const centerX = slopeX + width / 2;
            const centerY = slopeY + height / 2;
            const arrowLength = 30;
            // Normalize direction vector
            const dirLength = Math.sqrt(slope.direction.x * slope.direction.x + slope.direction.y * slope.direction.y);
            const normalizedDirX = slope.direction.x / dirLength;
            const normalizedDirY = slope.direction.y / dirLength;
            const arrowEndX = centerX + normalizedDirX * arrowLength;
            const arrowEndY = centerY + normalizedDirY * arrowLength;
            // Draw arrow shaft
            this.ctx.strokeStyle = '#654321';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(arrowEndX, arrowEndY);
            this.ctx.stroke();
            // Draw arrow head
            const headLength = 8;
            const headAngle = Math.PI / 6;
            const angle = Math.atan2(normalizedDirY, normalizedDirX);
            this.ctx.beginPath();
            this.ctx.moveTo(arrowEndX, arrowEndY);
            this.ctx.lineTo(arrowEndX - headLength * Math.cos(angle - headAngle), arrowEndY - headLength * Math.sin(angle - headAngle));
            this.ctx.moveTo(arrowEndX, arrowEndY);
            this.ctx.lineTo(arrowEndX - headLength * Math.cos(angle + headAngle), arrowEndY - headLength * Math.sin(angle + headAngle));
            this.ctx.stroke();
            // Draw steepness level indicator
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(displayLevel.toString(), centerX, slopeY + height - 10);
            // Reset text alignment but don't change fillStyle back to sandy color
            this.ctx.textAlign = 'left';
        }
    }
    renderLakes() {
        for (const lake of this.currentTrack.lakes) {
            this.ctx.fillStyle = lake.color;
            this.ctx.fillRect(lake.position.x, lake.position.y, lake.width, lake.height);
            this.ctx.strokeStyle = '#1E90FF';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(lake.position.x, lake.position.y, lake.width, lake.height);
        }
    }
    renderWalls() {
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = 'round';
        for (const wall of this.currentTrack.walls) {
            this.ctx.beginPath();
            this.ctx.moveTo(wall.start.x, wall.start.y);
            this.ctx.lineTo(wall.end.x, wall.end.y);
            this.ctx.stroke();
        }
    }
    renderHole() {
        this.ctx.fillStyle = this.hole.color;
        this.ctx.beginPath();
        this.ctx.arc(this.hole.position.x, this.hole.position.y, this.hole.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    renderBall() {
        this.ctx.fillStyle = this.ball.color;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.position.x, this.ball.position.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    renderAimLine() {
        if (this.gameState === 'aiming') {
            const lineLength = 60;
            const endX = this.ball.position.x + Math.cos(this.aimDirection) * lineLength;
            const endY = this.ball.position.y + Math.sin(this.aimDirection) * lineLength;
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(this.ball.position.x, this.ball.position.y);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.arc(endX, endY, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    renderUI() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Strokes: ${this.strokeCount}`, this.canvas.width - 120, 30);
        this.ctx.fillText(`Track: ${this.currentTrack.name}`, this.canvas.width - 120, 50);
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Press T for track selection', this.canvas.width - 160, 70);
        if (this.gameState === 'completed') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Hole Complete!', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = '18px Arial';
            this.ctx.fillText(`Track: ${this.currentTrack.name}`, this.canvas.width / 2, this.canvas.height / 2 - 30);
            this.ctx.fillText(`Final Score: ${this.strokeCount} strokes`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Press SPACE or ENTER to play again', this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.fillText('Press T to select different track', this.canvas.width / 2, this.canvas.height / 2 + 50);
            this.ctx.textAlign = 'left';
        }
        else if (this.gameState === 'trackSelect') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Select Track', this.canvas.width / 2, this.canvas.height / 2 - 80);
            this.ctx.font = '18px Arial';
            for (let i = 0; i < this.tracks.length; i++) {
                const track = this.tracks[i];
                const y = this.canvas.height / 2 - 30 + (i * 30);
                this.ctx.fillStyle = i === this.currentTrackIndex ? '#FFD700' : 'white';
                this.ctx.fillText(`${i + 1}. ${track.name}`, this.canvas.width / 2, y);
            }
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Press 1-4 to select track, ESC to cancel', this.canvas.width / 2, this.canvas.height / 2 + 60);
            this.ctx.textAlign = 'left';
        }
    }
    resetGame() {
        this.ball = new Ball(this.currentTrack.ballStart.x, this.currentTrack.ballStart.y);
        this.hole = new Hole(this.currentTrack.hole.x, this.currentTrack.hole.y);
        this.aimDirection = 0;
        this.powerLevel = 0;
        this.isChargingPower = false;
        this.gameState = 'aiming';
        this.strokeCount = 0;
        this.updatePowerMeter();
    }
    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.update(deltaTime);
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}
new KolfGame();
