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
        this.fallingDinosaurs = [];
        this.fallingMonsters = [];
        this.lastDinosaurSpawn = 0;
        this.lastMonsterSpawn = 0;
        this.dinosaurSpawnInterval = 2000; // Start with 2 seconds between spawns
        this.monsterSpawnInterval = 4000; // Monsters spawn less frequently
        this.dinosaurSpeed = 1; // Starting speed
        this.monsterSpeed = 1.5; // Monsters move slightly faster
        this.difficulty = 1;
        this.peppaPosition = null;
        this.georgePosition = null;
        
        // Load character and item images
        this.peppaImage = new Image();
        this.georgeImage = new Image();
        this.dinosaurImage = new Image();
        this.peppaImage.crossOrigin = 'anonymous';
        this.georgeImage.crossOrigin = 'anonymous';
        this.dinosaurImage.crossOrigin = 'anonymous';
        this.peppaImageLoaded = false;
        this.georgeImageLoaded = false;
        this.dinosaurImageLoaded = false;
        this.loadCharacterImages();
        
        this.init();
    }

    loadCharacterImages() {
        // Load Peppa Pig image
        this.peppaImage.onload = () => {
            this.peppaImageLoaded = true;
            console.log('Peppa image loaded successfully');
        };
        
        this.peppaImage.onerror = () => {
            console.log('Peppa image failed to load, using emoji fallback');
            this.peppaImageLoaded = false;
        };
        
        // Load George image
        this.georgeImage.onload = () => {
            this.georgeImageLoaded = true;
            console.log('George image loaded successfully');
        };
        
        this.georgeImage.onerror = () => {
            console.log('George image failed to load, using emoji fallback');
            this.georgeImageLoaded = false;
        };
        
        // Load dinosaur image
        this.dinosaurImage.onload = () => {
            this.dinosaurImageLoaded = true;
            console.log('Dinosaur image loaded successfully');
        };
        
        this.dinosaurImage.onerror = () => {
            console.log('Dinosaur image failed to load, using emoji fallback');
            this.dinosaurImageLoaded = false;
        };
        
        // Load actual PNG images
        this.peppaImage.src = './peppa.png';
        this.georgeImage.src = './george.png';
        this.dinosaurImage.src = './dinosaur.png';
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
            this.handleInitError(error);
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
        try {
            console.log('Starting hand tracking setup...');
            
            this.hands = new Hands({
                locateFile: (file) => {
                    console.log('Loading MediaPipe file:', file);
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            console.log('Setting hand tracking options...');
            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => {
                console.log('Hand tracking results:', results);
                this.onHandsDetected(results);
            });

            console.log('Initializing camera...');
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    if (this.isInitialized) {
                        try {
                            await this.hands.send({ image: this.video });
                        } catch (error) {
                            console.error('Error sending frame to hands:', error);
                        }
                    }
                },
                width: 640,
                height: 480
            });
            
            console.log('Hand tracking setup complete!');
        } catch (error) {
            console.error('Hand tracking setup failed:', error);
            throw error;
        }
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
            
            // Move appropriate character based on hand
            if (label === 'Right') {
                this.movePeppaToPosition(canvasX, canvasY);
            } else if (label === 'Left') {
                this.moveGeorgeToPosition(canvasX, canvasY);
            }
        }
    }

    movePeppaToPosition(canvasX, canvasY) {
        const gameArea = this.rightBall.parentElement;
        const peppaWidth = 50; // Peppa size
        const peppaHeight = 50;
        
        // Convert canvas coordinates to game area coordinates
        // Account for the mirrored video (scaleX(-1))
        const gameAreaX = gameArea.offsetWidth - (canvasX * gameArea.offsetWidth / this.canvas.width);
        const gameAreaY = canvasY * gameArea.offsetHeight / this.canvas.height;
        
        // Constrain Peppa position within game area bounds
        const constrainedX = Math.max(0, Math.min(gameAreaX - peppaWidth / 2, gameArea.offsetWidth - peppaWidth));
        const constrainedY = Math.max(0, Math.min(gameAreaY - peppaHeight / 2, gameArea.offsetHeight - peppaHeight));
        
        // Create water ripples when Peppa moves
        const currentPos = { x: constrainedX + peppaWidth / 2, y: constrainedY + peppaHeight / 2 };
        const lastPos = this.lastRightPos;
        
        if (lastPos) {
            const distance = Math.sqrt(Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2));
            if (distance > 5) { // Only create ripples if Peppa moved significantly
                this.createRipple(currentPos.x, currentPos.y, distance * 0.2);
            }
        }
        
        // Update last position
        this.lastRightPos = currentPos;
        this.peppaPosition = currentPos;
        
        // Hide both balls since we'll draw characters on the canvas
        this.rightBall.style.display = 'none';
        this.leftBall.style.display = 'none';
    }

    moveGeorgeToPosition(canvasX, canvasY) {
        const gameArea = this.rightBall.parentElement;
        const georgeWidth = 50; // George size
        const georgeHeight = 50;
        
        // Convert canvas coordinates to game area coordinates
        // Account for the mirrored video (scaleX(-1))
        const gameAreaX = gameArea.offsetWidth - (canvasX * gameArea.offsetWidth / this.canvas.width);
        const gameAreaY = canvasY * gameArea.offsetHeight / this.canvas.height;
        
        // Constrain George position within game area bounds
        const constrainedX = Math.max(0, Math.min(gameAreaX - georgeWidth / 2, gameArea.offsetWidth - georgeWidth));
        const constrainedY = Math.max(0, Math.min(gameAreaY - georgeHeight / 2, gameArea.offsetHeight - georgeHeight));
        
        // Create water ripples when George moves
        const currentPos = { x: constrainedX + georgeWidth / 2, y: constrainedY + georgeHeight / 2 };
        const lastPos = this.lastLeftPos;
        
        if (lastPos) {
            const distance = Math.sqrt(Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2));
            if (distance > 5) { // Only create ripples if George moved significantly
                this.createRipple(currentPos.x, currentPos.y, distance * 0.2);
            }
        }
        
        // Update last position
        this.lastLeftPos = currentPos;
        this.georgePosition = currentPos;
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
        
        // Draw falling items only if game is running
        if (this.gameRunning) {
            // Draw dinosaurs (good items)
            this.fallingDinosaurs.forEach(dinosaur => {
                if (this.dinosaurImageLoaded && this.dinosaurImage.complete) {
                    // Draw the actual dinosaur image (doubled size)
                    this.waterCtx.drawImage(
                        this.dinosaurImage,
                        dinosaur.x - dinosaur.radius * 2,
                        dinosaur.y - dinosaur.radius * 2,
                        dinosaur.radius * 4,
                        dinosaur.radius * 4
                    );
                } else {
                    // Fallback: draw colored circle with emoji
                    this.waterCtx.fillStyle = 'rgba(76, 175, 80, 0.9)';
                    this.waterCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                    this.waterCtx.shadowBlur = 8;
                    this.waterCtx.beginPath();
                    this.waterCtx.arc(dinosaur.x, dinosaur.y, dinosaur.radius, 0, Math.PI * 2);
                    this.waterCtx.fill();
                    this.waterCtx.shadowBlur = 0;
                    
                    this.waterCtx.fillStyle = 'white';
                    this.waterCtx.font = '20px Arial';
                    this.waterCtx.textAlign = 'center';
                    this.waterCtx.fillText('🦕', dinosaur.x, dinosaur.y + 7);
                }
            });
            
            // Draw monsters (bad items)
            this.fallingMonsters.forEach(monster => {
                this.waterCtx.fillStyle = 'rgba(139, 69, 19, 0.9)';
                this.waterCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                this.waterCtx.shadowBlur = 10;
                this.waterCtx.beginPath();
                this.waterCtx.arc(monster.x, monster.y, monster.radius, 0, Math.PI * 2);
                this.waterCtx.fill();
                this.waterCtx.shadowBlur = 0;
                
                this.waterCtx.fillStyle = 'white';
                this.waterCtx.font = '18px Arial';
                this.waterCtx.textAlign = 'center';
                this.waterCtx.fillText('👹', monster.x, monster.y + 6);
            });
            
            // Draw characters
            this.drawPeppa();
            this.drawGeorge();
            
            // Draw game UI
            this.drawGameUI();
        } else {
            // Game is over - draw the game over screen
            this.showGameOverScreen();
        }
    }

    drawPeppa() {
        if (!this.peppaPosition) return;
        
        if (this.peppaImageLoaded && this.peppaImage.complete) {
            // Draw the Peppa image (doubled size for better visibility)
            this.waterCtx.drawImage(
                this.peppaImage, 
                this.peppaPosition.x - 60, 
                this.peppaPosition.y - 60, 
                120, 
                120
            );
        } else {
            // Fallback: draw a simple Peppa representation
            this.waterCtx.fillStyle = '#ff69b4';
            this.waterCtx.strokeStyle = '#ff1493';
            this.waterCtx.lineWidth = 3;
            this.waterCtx.beginPath();
            this.waterCtx.arc(this.peppaPosition.x, this.peppaPosition.y, 25, 0, Math.PI * 2);
            this.waterCtx.fill();
            this.waterCtx.stroke();
            
            // Add simple face
            this.waterCtx.fillStyle = 'black';
            this.waterCtx.beginPath();
            this.waterCtx.arc(this.peppaPosition.x - 8, this.peppaPosition.y - 5, 3, 0, Math.PI * 2);
            this.waterCtx.fill();
            this.waterCtx.beginPath();
            this.waterCtx.arc(this.peppaPosition.x + 8, this.peppaPosition.y - 5, 3, 0, Math.PI * 2);
            this.waterCtx.fill();
            
            // Add snout
            this.waterCtx.fillStyle = '#ff1493';
            this.waterCtx.beginPath();
            this.waterCtx.ellipse(this.peppaPosition.x, this.peppaPosition.y + 5, 8, 5, 0, 0, Math.PI * 2);
            this.waterCtx.fill();
            
            // Add text
            this.waterCtx.fillStyle = 'white';
            this.waterCtx.font = '10px Arial';
            this.waterCtx.textAlign = 'center';
            this.waterCtx.fillText('🐷', this.peppaPosition.x, this.peppaPosition.y + 2);
        }
    }

    drawGeorge() {
        if (!this.georgePosition) return;
        
        if (this.georgeImageLoaded && this.georgeImage.complete) {
            // Draw the George image (doubled size)
            this.waterCtx.drawImage(
                this.georgeImage, 
                this.georgePosition.x - 50, 
                this.georgePosition.y - 50, 
                100, 
                100
            );
        } else {
            // Fallback: draw a simple George representation
            this.waterCtx.fillStyle = '#4a90e2';
            this.waterCtx.strokeStyle = '#2e5ea8';
            this.waterCtx.lineWidth = 3;
            this.waterCtx.beginPath();
            this.waterCtx.arc(this.georgePosition.x, this.georgePosition.y, 22, 0, Math.PI * 2);
            this.waterCtx.fill();
            this.waterCtx.stroke();
            
            // Add simple face
            this.waterCtx.fillStyle = 'black';
            this.waterCtx.beginPath();
            this.waterCtx.arc(this.georgePosition.x - 7, this.georgePosition.y - 4, 2.5, 0, Math.PI * 2);
            this.waterCtx.fill();
            this.waterCtx.beginPath();
            this.waterCtx.arc(this.georgePosition.x + 7, this.georgePosition.y - 4, 2.5, 0, Math.PI * 2);
            this.waterCtx.fill();
            
            // Add snout
            this.waterCtx.fillStyle = '#2e5ea8';
            this.waterCtx.beginPath();
            this.waterCtx.ellipse(this.georgePosition.x, this.georgePosition.y + 4, 6, 4, 0, 0, Math.PI * 2);
            this.waterCtx.fill();
            
            // Add text
            this.waterCtx.fillStyle = 'white';
            this.waterCtx.font = '8px Arial';
            this.waterCtx.textAlign = 'center';
            this.waterCtx.fillText('🐷', this.georgePosition.x, this.georgePosition.y + 1);
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
        
        // Spawn new falling dinosaurs
        if (currentTime - this.lastDinosaurSpawn > this.dinosaurSpawnInterval) {
            this.spawnFallingDinosaur();
            this.lastDinosaurSpawn = currentTime;
        }
        
        // Spawn new falling monsters
        if (currentTime - this.lastMonsterSpawn > this.monsterSpawnInterval) {
            this.spawnFallingMonster();
            this.lastMonsterSpawn = currentTime;
        }
        
        // Update falling dinosaurs
        this.fallingDinosaurs.forEach((dinosaur, index) => {
            dinosaur.y += dinosaur.speed;
            
            // Remove dinosaurs that have fallen off screen
            if (dinosaur.y > window.innerHeight + dinosaur.radius) {
                this.fallingDinosaurs.splice(index, 1);
            }
        });
        
        // Update falling monsters
        this.fallingMonsters.forEach((monster, index) => {
            monster.y += monster.speed;
            
            // Remove monsters that have fallen off screen
            if (monster.y > window.innerHeight + monster.radius) {
                this.fallingMonsters.splice(index, 1);
            }
        });
        
        // Check collisions
        this.checkCollisions();
        
        // Increase difficulty over time
        this.updateDifficulty();
    }

    spawnFallingDinosaur() {
        const dinosaur = {
            x: Math.random() * window.innerWidth,
            y: -30,
            radius: 20,
            speed: this.dinosaurSpeed
        };
        this.fallingDinosaurs.push(dinosaur);
    }

    spawnFallingMonster() {
        const monster = {
            x: Math.random() * window.innerWidth,
            y: -30,
            radius: 18,
            speed: this.monsterSpeed
        };
        this.fallingMonsters.push(monster);
    }

    checkCollisions() {
        const characters = [];
        
        if (this.peppaPosition) {
            characters.push({ pos: this.peppaPosition, name: 'Peppa' });
        }
        if (this.georgePosition) {
            characters.push({ pos: this.georgePosition, name: 'George' });
        }
        
        // Check dinosaur collisions (good items)
        this.fallingDinosaurs.forEach((dinosaur, dinosaurIndex) => {
            characters.forEach(character => {
                const distance = Math.sqrt(
                    Math.pow(dinosaur.x - character.pos.x, 2) + 
                    Math.pow(dinosaur.y - character.pos.y, 2)
                );
                
                if (distance < dinosaur.radius + 30) { // Increased for better collision with larger Peppa
                    this.handleDinosaurCollection(dinosaurIndex, character.name);
                }
            });
        });
        
        // Check monster collisions (bad items)
        this.fallingMonsters.forEach((monster, monsterIndex) => {
            characters.forEach(character => {
                const distance = Math.sqrt(
                    Math.pow(monster.x - character.pos.x, 2) + 
                    Math.pow(monster.y - character.pos.y, 2)
                );
                
                if (distance < monster.radius + 30) { // Increased for better collision with larger characters
                    this.handleMonsterCollision(monsterIndex, character.name);
                }
            });
        });
    }

    handleDinosaurCollection(dinosaurIndex, characterName) {
        // Get dinosaur position before removing it
        const dinosaur = this.fallingDinosaurs[dinosaurIndex];
        
        // Remove the collected dinosaur
        this.fallingDinosaurs.splice(dinosaurIndex, 1);
        
        // Add points
        this.score += 1;
        
        // Create celebration ripple
        this.createRipple(dinosaur.x, dinosaur.y, 3);
        
        console.log(`${characterName} collected a dinosaur! Score: ${this.score}`);
    }

    handleMonsterCollision(monsterIndex, characterName) {
        // Get monster position before removing it
        const monster = this.fallingMonsters[monsterIndex];
        
        // Remove the monster
        this.fallingMonsters.splice(monsterIndex, 1);
        
        // Lose a life
        this.lives--;
        
        // Create danger ripple
        this.createRipple(monster.x, monster.y, 5);
        
        console.log(`${characterName} hit a monster! Lives remaining: ${this.lives}`);
        
        // Check game over
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    updateDifficulty() {
        // Increase difficulty based on score (every 10 dinosaurs collected)
        const newDifficulty = Math.floor(this.score / 10) + 1;
        if (newDifficulty > this.difficulty) {
            this.difficulty = newDifficulty;
            this.dinosaurSpeed = Math.min(1 + (this.difficulty - 1) * 0.3, 5);
            this.monsterSpeed = Math.min(1.5 + (this.difficulty - 1) * 0.4, 6);
            this.dinosaurSpawnInterval = Math.max(2000 - (this.difficulty - 1) * 150, 1000);
            this.monsterSpawnInterval = Math.max(4000 - (this.difficulty - 1) * 200, 2000);
        }
    }

    drawGameUI() {
        // Draw lives
        this.waterCtx.fillStyle = 'white';
        this.waterCtx.font = '28px Arial';
        this.waterCtx.fillText(`❤️ Lives: ${this.lives}`, 20, 40);
        
        // Draw score (dinosaurs collected)
        this.waterCtx.font = '24px Arial';
        this.waterCtx.fillText(`🦕 Dinosaurs: ${this.score}`, 20, 75);
        
        // Draw level
        this.waterCtx.font = '20px Arial';
        this.waterCtx.fillText(`Level: ${this.difficulty}`, 20, 105);
        
        // Show character tracking status
        this.waterCtx.font = '16px Arial';
        let statusY = 130;
        
        if (this.peppaPosition) {
            this.waterCtx.fillStyle = '#ff69b4';
            this.waterCtx.fillText('🐷 Peppa: Ready', 20, statusY);
        } else {
            this.waterCtx.fillStyle = '#FF5722';
            this.waterCtx.fillText('🐷 Peppa: Show right hand', 20, statusY);
        }
        
        statusY += 25;
        if (this.georgePosition) {
            this.waterCtx.fillStyle = '#4a90e2';
            this.waterCtx.fillText('🐷 George: Ready', 20, statusY);
        } else {
            this.waterCtx.fillStyle = '#FF5722';
            this.waterCtx.fillText('🐷 George: Show left hand', 20, statusY);
        }
    }

    gameOver() {
        this.gameRunning = false;
        
        // Clear any remaining falling items
        this.fallingDinosaurs = [];
        this.fallingMonsters = [];
        
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
        this.waterCtx.fillText(`🦕 Dinosaurs Collected: ${this.score}`, this.waterCanvas.width / 2, this.waterCanvas.height / 2 - 20);
        
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
        if (this.score >= 100) return "🏆 AMAZING! Peppa is a dinosaur collector!";
        if (this.score >= 50) return "🎉 Excellent work, Peppa!";
        if (this.score >= 30) return "👏 Great job collecting dinosaurs!";
        if (this.score >= 20) return "👍 Nice work, Peppa!";
        if (this.score >= 10) return "💪 Good effort collecting!";
        return "🦕 Keep collecting dinosaurs!";
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
        this.fallingDinosaurs = [];
        this.fallingMonsters = [];
        this.lastDinosaurSpawn = 0;
        this.lastMonsterSpawn = 0;
        this.dinosaurSpawnInterval = 2000;
        this.monsterSpawnInterval = 4000;
        this.dinosaurSpeed = 1;
        this.monsterSpeed = 1.5;
        this.difficulty = 1;
        this.restartButton = null;
        this.peppaPosition = null;
        this.georgePosition = null;
    }

    handleInitError(error) {
        let message = '';
        
        if (error.name === 'NotAllowedError') {
            message = '🎥 Camera permission denied!\n\n' +
                     '1. Click the camera icon in your address bar\n' +
                     '2. Allow camera access\n' +
                     '3. Refresh the page\n\n' +
                     'Or check your browser settings to enable camera for this site.';
        } else if (error.name === 'NotFoundError') {
            message = '📷 No camera found!\n\nPlease connect a camera and refresh the page.';
        } else if (error.name === 'NotReadableError') {
            message = '⚠️ Camera is being used by another application.\n\nClose other apps using the camera and refresh.';
        } else {
            message = '❌ Failed to initialize camera or hand tracking.\n\n' +
                     'Try:\n' +
                     '• Refresh the page\n' +
                     '• Check camera permissions\n' +
                     '• Use a different browser\n' +
                     '• Serve from http://localhost instead of file://';
        }
        
        // Show error on screen instead of alert
        this.showErrorScreen(message);
    }

    showErrorScreen(message) {
        // Clear canvas and show error
        this.waterCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.waterCtx.fillRect(0, 0, this.waterCanvas.width, this.waterCanvas.height);
        
        // Error message
        this.waterCtx.fillStyle = 'white';
        this.waterCtx.font = '24px Arial';
        this.waterCtx.textAlign = 'center';
        
        const lines = message.split('\n');
        lines.forEach((line, index) => {
            this.waterCtx.fillText(line, this.waterCanvas.width / 2, 200 + index * 35);
        });
        
        // Refresh button
        this.waterCtx.fillStyle = '#4CAF50';
        this.waterCtx.fillRect(this.waterCanvas.width / 2 - 100, this.waterCanvas.height - 200, 200, 60);
        
        this.waterCtx.fillStyle = 'white';
        this.waterCtx.font = 'bold 20px Arial';
        this.waterCtx.fillText('Refresh Page', this.waterCanvas.width / 2, this.waterCanvas.height - 165);
        
        this.waterCtx.textAlign = 'left';
        
        // Add click to refresh
        this.waterCanvas.addEventListener('click', () => {
            location.reload();
        }, { once: true });
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