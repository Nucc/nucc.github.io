class HandMotionController {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.waterCanvas = document.getElementById('waterCanvas');
        this.waterCtx = this.waterCanvas.getContext('2d');
        this.rightBall = document.getElementById('rightBall');
        this.leftBall = document.getElementById('leftBall');
        this.hands = null;
        this.camera = null;
        this.isInitialized = false;
        this.showCamera = window.location.hash === '#cam';
        
        // Water effect properties
        this.ripples = [];
        this.lastRightPos = null;
        this.lastLeftPos = null;
        
        // Game properties
        this.lives = 3;
        this.score = 0;
        this.gameRunning = true;
        this.fallingBalls = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 3000; // Start with 3 seconds between spawns
        this.ballSpeed = 2; // Starting speed - faster than before
        this.difficulty = 1;
        
        this.init();
    }

    async init() {
        try {
            this.setupVideoDisplay();
            this.setupWaterCanvas();
            await this.setupCamera();
            await this.setupHandTracking();
            this.startTracking();
            this.startWaterAnimation();
            this.startGameLoop();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize:', error);
            alert('Failed to access camera or initialize hand tracking. Please ensure you have a camera connected and grant permission.');
        }
    }

    setupVideoDisplay() {
        if (!this.showCamera) {
            this.video.style.display = 'none';
            this.canvas.style.display = 'none';
        }
    }

    setupWaterCanvas() {
        this.waterCanvas.width = window.innerWidth;
        this.waterCanvas.height = window.innerHeight;
        
        // Resize water canvas on window resize
        window.addEventListener('resize', () => {
            this.waterCanvas.width = window.innerWidth;
            this.waterCanvas.height = window.innerHeight;
        });
    }

    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    resolve();
                };
            });
        } catch (error) {
            throw new Error('Camera access denied or not available');
        }
    }

    async setupHandTracking() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => {
            this.onHandsDetected(results);
        });

        this.camera = new Camera(this.video, {
            onFrame: async () => {
                if (this.isInitialized) {
                    await this.hands.send({ image: this.video });
                }
            },
            width: 640,
            height: 480
        });
    }

    startTracking() {
        this.camera.start();
    }

    onHandsDetected(results) {
        // Clear canvas only if showing camera
        if (this.showCamera) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw hand landmarks if detected
            if (results.multiHandLandmarks) {
                for (const landmarks of results.multiHandLandmarks) {
                    drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
                        color: '#00FF00',
                        lineWidth: 2
                    });
                    drawLandmarks(this.ctx, landmarks, {
                        color: '#FF0000',
                        lineWidth: 1
                    });
                }
            }
        }

        // Process hand gestures
        this.processHandGestures(results);
    }

    processHandGestures(results) {
        if (!results.multiHandLandmarks || !results.multiHandedness) {
            return;
        }

        // Process each detected hand
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i];
            const label = handedness.label; // 'Left' or 'Right'
            
            // Use the palm center (landmark 9) for tracking
            const palmCenter = landmarks[9];
            
            // Convert normalized coordinates to canvas coordinates
            const canvasX = palmCenter.x * this.canvas.width;
            const canvasY = palmCenter.y * this.canvas.height;
            
            // Move appropriate ball based on hand
            if (label === 'Right') {
                this.moveBallToPosition(this.rightBall, canvasX, canvasY, 'right');
            } else if (label === 'Left') {
                this.moveBallToPosition(this.leftBall, canvasX, canvasY, 'left');
            }
        }
    }

    moveBallToPosition(ball, canvasX, canvasY, hand) {
        const gameArea = ball.parentElement;
        const ballWidth = ball.offsetWidth;
        const ballHeight = ball.offsetHeight;
        
        // Convert canvas coordinates to game area coordinates
        // Account for the mirrored video (scaleX(-1))
        const gameAreaX = gameArea.offsetWidth - (canvasX * gameArea.offsetWidth / this.canvas.width);
        const gameAreaY = canvasY * gameArea.offsetHeight / this.canvas.height;
        
        // Constrain ball position within game area bounds
        const constrainedX = Math.max(0, Math.min(gameAreaX - ballWidth / 2, gameArea.offsetWidth - ballWidth));
        const constrainedY = Math.max(0, Math.min(gameAreaY - ballHeight / 2, gameArea.offsetHeight - ballHeight));
        
        // Create water ripples when ball moves
        const currentPos = { x: constrainedX + ballWidth / 2, y: constrainedY + ballHeight / 2 };
        const lastPos = hand === 'right' ? this.lastRightPos : this.lastLeftPos;
        
        if (lastPos) {
            const distance = Math.sqrt(Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2));
            if (distance > 5) { // Only create ripples if ball moved significantly
                this.createRipple(currentPos.x, currentPos.y, distance * 0.3);
            }
        }
        
        // Update last position
        if (hand === 'right') {
            this.lastRightPos = currentPos;
        } else {
            this.lastLeftPos = currentPos;
        }
        
        // Apply position with smooth transition
        ball.style.left = constrainedX + 'px';
        ball.style.top = constrainedY + 'px';
        ball.style.transform = 'none';
    }

    createRipple(x, y, intensity = 1) {
        this.ripples.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 150 + intensity * 50,
            opacity: 0.8,
            speed: 2 + intensity * 0.5,
            decay: 0.02
        });
    }

    startWaterAnimation() {
        const animate = () => {
            this.drawWaterEffect();
            requestAnimationFrame(animate);
        };
        animate();
    }

    drawWaterEffect() {
        // Clear canvas
        this.waterCtx.clearRect(0, 0, this.waterCanvas.width, this.waterCanvas.height);
        
        // Draw water background gradient
        const gradient = this.waterCtx.createLinearGradient(0, 0, 0, this.waterCanvas.height);
        gradient.addColorStop(0, '#1e3c72');
        gradient.addColorStop(0.5, '#2a5298');
        gradient.addColorStop(1, '#1e3c72');
        this.waterCtx.fillStyle = gradient;
        this.waterCtx.fillRect(0, 0, this.waterCanvas.width, this.waterCanvas.height);
        
        // Draw ripples
        this.ripples.forEach((ripple, index) => {
            // Update ripple
            ripple.radius += ripple.speed;
            ripple.opacity -= ripple.decay;
            
            // Draw ripple
            if (ripple.opacity > 0 && ripple.radius < ripple.maxRadius) {
                this.waterCtx.strokeStyle = `rgba(255, 255, 255, ${ripple.opacity * 0.3})`;
                this.waterCtx.lineWidth = 2;
                this.waterCtx.beginPath();
                this.waterCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                this.waterCtx.stroke();
                
                // Draw inner ripple
                this.waterCtx.strokeStyle = `rgba(173, 216, 230, ${ripple.opacity * 0.2})`;
                this.waterCtx.lineWidth = 1;
                this.waterCtx.beginPath();
                this.waterCtx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
                this.waterCtx.stroke();
            } else {
                // Remove expired ripples
                this.ripples.splice(index, 1);
            }
        });
        
        // Draw falling balls only if game is running
        if (this.gameRunning) {
            this.fallingBalls.forEach(ball => {
                this.waterCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                this.waterCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                this.waterCtx.shadowBlur = 10;
                this.waterCtx.beginPath();
                this.waterCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                this.waterCtx.fill();
                this.waterCtx.shadowBlur = 0;
            });
            
            // Draw game UI
            this.drawGameUI();
        } else {
            // Game is over - draw the game over screen
            this.showGameOverScreen();
        }
    }

    startGameLoop() {
        const gameLoop = () => {
            if (this.gameRunning) {
                this.updateGame();
            }
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }

    updateGame() {
        const currentTime = Date.now();
        
        // Spawn new falling balls
        if (currentTime - this.lastSpawnTime > this.spawnInterval) {
            this.spawnFallingBall();
            this.lastSpawnTime = currentTime;
        }
        
        // Update falling balls
        this.fallingBalls.forEach((ball, index) => {
            ball.y += ball.speed;
            
            // Remove balls that have fallen off screen
            if (ball.y > window.innerHeight + ball.radius) {
                this.fallingBalls.splice(index, 1);
                this.score += 10; // Points for surviving a ball
            }
        });
        
        // Check collisions
        this.checkCollisions();
        
        // Increase difficulty over time
        this.updateDifficulty();
    }

    spawnFallingBall() {
        const ball = {
            x: Math.random() * window.innerWidth,
            y: -30,
            radius: 15,
            speed: this.ballSpeed
        };
        this.fallingBalls.push(ball);
    }

    checkCollisions() {
        const playerBalls = [
            { element: this.rightBall, pos: this.getRightBallPosition() },
            { element: this.leftBall, pos: this.getLeftBallPosition() }
        ];
        
        this.fallingBalls.forEach((fallingBall, fallingIndex) => {
            playerBalls.forEach(playerBall => {
                if (playerBall.pos) {
                    const distance = Math.sqrt(
                        Math.pow(fallingBall.x - playerBall.pos.x, 2) + 
                        Math.pow(fallingBall.y - playerBall.pos.y, 2)
                    );
                    
                    if (distance < fallingBall.radius + 25) { // 25 is half of player ball size
                        // Collision detected!
                        this.handleCollision(fallingIndex);
                    }
                }
            });
        });
    }

    getRightBallPosition() {
        if (!this.rightBall.style.left || !this.rightBall.style.top) return null;
        return {
            x: parseFloat(this.rightBall.style.left) + 25,
            y: parseFloat(this.rightBall.style.top) + 25
        };
    }

    getLeftBallPosition() {
        if (!this.leftBall.style.left || !this.leftBall.style.top) return null;
        return {
            x: parseFloat(this.leftBall.style.left) + 25,
            y: parseFloat(this.leftBall.style.top) + 25
        };
    }

    handleCollision(fallingBallIndex) {
        // Remove the falling ball
        this.fallingBalls.splice(fallingBallIndex, 1);
        
        // Lose a life
        this.lives--;
        
        // Create explosion ripple
        const ball = this.fallingBalls[fallingBallIndex] || { x: window.innerWidth/2, y: window.innerHeight/2 };
        this.createRipple(ball.x, ball.y, 5);
        
        // Check game over
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    updateDifficulty() {
        // Increase difficulty based on score
        const newDifficulty = Math.floor(this.score / 100) + 1;
        if (newDifficulty > this.difficulty) {
            this.difficulty = newDifficulty;
            this.ballSpeed = Math.min(2 + (this.difficulty - 1) * 0.5, 8); // Max speed of 8, starts at 2
            this.spawnInterval = Math.max(3000 - (this.difficulty - 1) * 300, 600); // Min interval of 600ms
        }
    }

    drawGameUI() {
        // Draw lives
        this.waterCtx.fillStyle = 'white';
        this.waterCtx.font = '24px Arial';
        this.waterCtx.fillText(`Lives: ${this.lives}`, 20, 40);
        
        // Draw score
        this.waterCtx.fillText(`Score: ${this.score}`, 20, 80);
        
        // Draw difficulty
        this.waterCtx.fillText(`Level: ${this.difficulty}`, 20, 120);
    }

    gameOver() {
        this.gameRunning = false;
        
        // Clear any remaining falling balls
        this.fallingBalls = [];
        
        // Add restart event listeners
        this.addRestartListeners();
        
        // Note: Game over screen will be drawn continuously in drawWaterEffect()
    }

    showGameOverScreen() {
        // Draw semi-transparent overlay
        this.waterCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.waterCtx.fillRect(0, 0, this.waterCanvas.width, this.waterCanvas.height);
        
        // Set text alignment to center
        this.waterCtx.textAlign = 'center';
        
        // Draw "GAME OVER" title
        this.waterCtx.fillStyle = '#ff4444';
        this.waterCtx.font = 'bold 72px Arial';
        this.waterCtx.strokeStyle = 'white';
        this.waterCtx.lineWidth = 3;
        this.waterCtx.strokeText('GAME OVER', this.waterCanvas.width / 2, this.waterCanvas.height / 2 - 80);
        this.waterCtx.fillText('GAME OVER', this.waterCanvas.width / 2, this.waterCanvas.height / 2 - 80);
        
        // Draw final score
        this.waterCtx.fillStyle = 'white';
        this.waterCtx.font = '36px Arial';
        this.waterCtx.fillText(`Your Final Score: ${this.score}`, this.waterCanvas.width / 2, this.waterCanvas.height / 2 - 20);
        
        // Draw level reached
        this.waterCtx.font = '28px Arial';
        this.waterCtx.fillText(`Level Reached: ${this.difficulty}`, this.waterCanvas.width / 2, this.waterCanvas.height / 2 + 20);
        
        // Performance message based on score
        let message = this.getPerformanceMessage();
        this.waterCtx.font = '24px Arial';
        this.waterCtx.fillStyle = '#ffd700';
        this.waterCtx.fillText(message, this.waterCanvas.width / 2, this.waterCanvas.height / 2 + 60);
        
        // Draw restart button
        this.drawRestartButton();
        
        // Restart instructions
        this.waterCtx.fillStyle = 'white';
        this.waterCtx.font = '24px Arial';
        this.waterCtx.fillText('Click the button above or press ENTER/SPACE to restart', this.waterCanvas.width / 2, this.waterCanvas.height / 2 + 180);
        
        // Reset text alignment
        this.waterCtx.textAlign = 'left';
    }

    drawRestartButton() {
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = this.waterCanvas.width / 2 - buttonWidth / 2;
        const buttonY = this.waterCanvas.height / 2 + 80;
        
        // Store button coordinates for click detection
        this.restartButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
        
        // Draw button background
        this.waterCtx.fillStyle = '#4CAF50';
        this.waterCtx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Draw button border
        this.waterCtx.strokeStyle = 'white';
        this.waterCtx.lineWidth = 3;
        this.waterCtx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Draw button text
        this.waterCtx.fillStyle = 'white';
        this.waterCtx.font = 'bold 28px Arial';
        this.waterCtx.textAlign = 'center';
        this.waterCtx.fillText('RESTART', this.waterCanvas.width / 2, this.waterCanvas.height / 2 + 115);
    }

    getPerformanceMessage() {
        if (this.score >= 500) return "🏆 AMAZING! You're a dodge master!";
        if (this.score >= 300) return "🎉 Excellent reflexes!";
        if (this.score >= 200) return "👏 Great job!";
        if (this.score >= 100) return "👍 Nice work!";
        if (this.score >= 50) return "💪 Good effort!";
        return "🎯 Keep practicing!";
    }

    addRestartListeners() {
        // Remove any existing listeners
        this.removeRestartListeners();
        
        // Add click listener for restart button
        this.restartClickHandler = (event) => {
            const rect = this.waterCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Check if click is within restart button
            if (this.restartButton && 
                x >= this.restartButton.x && 
                x <= this.restartButton.x + this.restartButton.width &&
                y >= this.restartButton.y && 
                y <= this.restartButton.y + this.restartButton.height) {
                this.restartGame();
            }
        };
        
        // Add keyboard listener for Enter/Space
        this.restartKeyHandler = (event) => {
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                this.restartGame();
            }
        };
        
        this.waterCanvas.addEventListener('click', this.restartClickHandler);
        document.addEventListener('keydown', this.restartKeyHandler);
    }

    removeRestartListeners() {
        if (this.restartClickHandler) {
            this.waterCanvas.removeEventListener('click', this.restartClickHandler);
        }
        if (this.restartKeyHandler) {
            document.removeEventListener('keydown', this.restartKeyHandler);
        }
    }

    restartGame() {
        // Remove restart listeners
        this.removeRestartListeners();
        
        // Reset game state
        this.lives = 3;
        this.score = 0;
        this.gameRunning = true;
        this.fallingBalls = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 3000;
        this.ballSpeed = 2; // Reset to faster starting speed
        this.difficulty = 1;
        this.restartButton = null;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HandMotionController();
    
    // Help modal functionality
    const helpButton = document.getElementById('helpButton');
    const helpModal = document.getElementById('helpModal');
    const closeButton = document.getElementById('closeButton');
    
    helpButton.addEventListener('click', () => {
        helpModal.classList.add('show');
    });
    
    closeButton.addEventListener('click', () => {
        helpModal.classList.remove('show');
    });
    
    // Close modal when clicking outside
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('show');
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && helpModal.classList.contains('show')) {
            helpModal.classList.remove('show');
        }
    });
});