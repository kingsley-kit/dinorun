class DinoGame {
    constructor() {
        this.dino = document.getElementById('dino');
        this.ground = document.getElementById('ground');
        this.scoreElement = document.getElementById('score');
        this.gameOverElement = document.getElementById('game-over');
        this.gameContainer = document.getElementById('game-container');
        
        this.isJumping = false;
        this.isGameOver = false;
        this.score = 0;
        this.jumpCharge = 0;
        this.maxJumpCharge = 150; // Reduced from 300ms to 150ms
        this.gravity = 0.7;
        this.minJumpForce = 11; // normal jump
        this.maxJumpForce = 13; // higher jump
        this.jumpChargeCap = 75; // Reduced from 150ms to 75ms
        this.velocity = 0;
        this.position = window.innerWidth <= 600 ? 20 : 45;
        this.obstacles = [];
        this.obstacleSpeed = 5.0;  // Reduced from 6.0 for easier start
        this.currentSpeed = 5.0;   // Reduced from 6.0 for easier start
        this.maxSpeed = 13.0;
        this.acceleration = 0.00065; // Reduced from 0.00065 for slower acceleration
        this.lastObstacleTime = 0;
        this.minObstacleInterval = 1200; // Increased from 800 for more time between obstacles
        this.maxObstacleInterval = 2000; // Increased from 1600 for more time between obstacles
        this.nextObstacleInterval = this.getRandomObstacleInterval();
        this.isOnGround = true;
        this.lastScoreUpdateTime = performance.now();
        this.scoreInterval = 50; // ms, fast arcade style
        this.difficulty = 1;
        this.baseMinGap = 400; // Increased from 250 for wider initial spacing
        this.minGapLimit = 110; // px, never go below this
        this.baseSpawnInterval = 2000; // Increased from 1600 for easier start
        this.spawnIntervalLimit = 600; // ms, never go below this
        this.lastObstacleRight = this.gameContainer.offsetWidth; // track rightmost obstacle
        this.distanceTraveled = 0;
        this.lastObstacleX = this.gameContainer.offsetWidth;
        this.nextObstacleDistance = this.getNextObstacleDistance();
        // Set jump force based on device
        if (window.innerWidth <= 600) {
            this.level1JumpForce = 11;  // Mobile jump force
            this.level2JumpForce = 15;
        } else {
            this.level1JumpForce = 15;
            this.level2JumpForce = 20;
        }
        
        // Cloud properties
        this.clouds = [];
        this.cloudSpeed = 2; // Slower than obstacles
        this.lastCloudTime = 0;
        this.cloudInterval = 3000; // New cloud every 3 seconds
        this.minCloudHeight = 50;
        this.maxCloudHeight = 300;
        
        // Background properties
        this.backgroundPosition = 0;
        this.backgroundSpeed = 0.5; // Adjust this value to control background scroll speed
        
        // Add running animation when game starts
        this.dino.classList.add('dino-running');
        
        this.goldenEgg = null;
        this.eggTimer = 0;
        this.nextEggTime = this.getNextEggTime();
        this.eggCount = 0;
        const eggCountElem = document.getElementById('egg-count');
        if (eggCountElem) eggCountElem.textContent = this.eggCount;
        this.isInvincible = false;
        this.invincibleTimeout = null;
        this.quizQuestions = [
            {
                question: "What is the highest-grossing film of all time without taking inflation into account?",
                options: ["A) Titanic", "B) Avengers:Endgame", "C) Avatar", "D) Star Wars: The Force Awakens"],
                answer: 1
            },
            {
                question: "Which film did Steven Spielberg win his first Oscar for Best Director?",
                options: ["A) Schindler's List", "B) Jaws", "C) Catch Me If You Can", "D) E.T."],
                answer: 0
            },
            {
                question: "What was the first feature-length animated film ever released?",
                options: ["A) Pinocchio", "B) Fantasia", "C) Snow White and the Seven Dwarfs", "D) Dumbo"],
                answer: 2
            },
            {
                question: " What is the name of Han Solo's ship?",
                options: ["A) Millennium Falcon", "B) Enterprise", "C) Apollo", "D) Discovery"],
                answer: 0
            },
            {
                question: "In Star Wars, which species stole the plans to the Death Star?",
                options: ["A) Ewoks", "B) Jawas", "C) Tusken Raiders", "D) Gungans"],
                answer: 2
            },
            {
                question: "What is Harry Potter's Patronus?",
                options: ["A) A horse", "B) An otter", "C) A hare", "D) A stag"],
                answer: 3
            },
            {
                question: "In Harry Potter, what does the Imperius Curse do? ",
                options: ["A) Mimics", "B) Controls", "C) Kills", "D) Tortures"],
                answer: 0
            },
            {
                question: "Who sings the 'Friends' theme song? ",
                options: ["A) The Beatles", "B) The Rolling Stones", "C) The Quick", "D) The Rembrandts"],
                answer: 3
            },
        ];
        this.quizActive = false;
        this.quizTimeout = null;
        this.quizAnswerCallback = null;
        this.quizTimerInterval = null;
        this.selectedQuizOption = null; // Track selected option for mobile
        // Track used questions
        this.resetQuizPool();
        
        // Rocket dino properties
        this.rocketDino = null;
        this.nextRocketTime = this.getNextRocketTime();
        this.isBoosting = false;
        this.boostTimeout = null;
        this.originalSpeed = this.obstacleSpeed;
        this.boostSpeed = this.obstacleSpeed * 2.5;
        
        // --- SOUND EFFECTS ---
        this.sounds = {
            jump: new Audio('assets/jump.mp3'),
            gameover: new Audio('assets/gameover.mp3'),
            rocketthrust: new Audio('assets/rocketthrust.mp3'),
            correctchoice: new Audio('assets/correctchoice.mp3'),
            wrongchoice: new Audio('assets/wrongchoice.mp3'),
            shield: new Audio('assets/shield.mp3'),
        };
        
        this.sparkleInterval = null; // For sparkle trail
        
        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (this.isGameOver) {
                    this.resetGame();
                } else if (!this.isJumping && this.isOnGround) {
                    this.startJump();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.isJumping) {
                this.releaseJump();
            }
        });

        // Touch controls - different behavior for mobile and desktop
        if (window.innerWidth <= 600) {
            // Mobile: Allow touch anywhere on screen
            document.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const quizModal = document.getElementById('quiz-modal');
                if (quizModal && quizModal.style.display === 'block') return;
                if (this.isGameOver) {
                    this.resetGame();
                } else if (!this.isJumping && this.isOnGround) {
                    this.startJump();
                }
            });

            document.addEventListener('touchend', (e) => {
                e.preventDefault();
                const quizModal = document.getElementById('quiz-modal');
                if (quizModal && quizModal.style.display === 'block') return;
                if (this.isJumping) {
                    this.releaseJump();
                }
            });
        } else {
            // Desktop: Keep touch events on game container only
            this.gameContainer.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const quizModal = document.getElementById('quiz-modal');
                if (quizModal && quizModal.style.display === 'block') return;
                if (this.isGameOver) {
                    this.resetGame();
                } else if (!this.isJumping && this.isOnGround) {
                    this.startJump();
                }
            });

            this.gameContainer.addEventListener('touchend', (e) => {
                e.preventDefault();
                const quizModal = document.getElementById('quiz-modal');
                if (quizModal && quizModal.style.display === 'block') return;
                if (this.isJumping) {
                    this.releaseJump();
                }
            });
        }
    }

    startJump() {
        this.isJumping = true;
        this.isOnGround = false;
        this.jumpCharge = 0;
        this.jumpStartTime = performance.now();
        // Remove running animation and add jumping sprite
        this.dino.classList.remove('dino-running');
        this.dino.classList.add('dino-jumping');
        // Play jump sound
        if (this.sounds.jump) { this.sounds.jump.currentTime = 0; this.sounds.jump.play(); }
        // Start charging jump, but do not set velocity yet
        this.jumpChargeInterval = setInterval(() => {
            const now = performance.now();
            this.jumpCharge = now - this.jumpStartTime;
            if (this.jumpCharge >= this.maxJumpCharge) {
                this.releaseJump();
            }
        }, 10);
    }

    releaseJump() {
        clearInterval(this.jumpChargeInterval);
        this.isJumping = false;
        // Determine jump force based on hold duration
        let force;
        if (this.jumpCharge <= 50) { // Reduced from 100ms to 50ms
            force = this.level1JumpForce;
        } else {
            const holdRatio = Math.min((this.jumpCharge - 50) / (this.maxJumpCharge - 50), 1);
            force = this.level1JumpForce + holdRatio * (this.level2JumpForce - this.level1JumpForce);
        }
        this.velocity = force;
        // No double jump allowed, jump is a single continuous motion
    }

    updateDino() {
        // Only apply gravity if not boosting
        if (!this.isBoosting) {
            this.velocity -= this.gravity;
            this.position += this.velocity;

            if (this.position <= 45) {
                this.position = 45;
                this.velocity = 0;
                this.isOnGround = true;
                // Add running animation when back on ground
                this.dino.classList.remove('dino-jumping');
                this.dino.classList.add('dino-running');
            } else {
                this.isOnGround = false;
            }
        }

        this.dino.style.bottom = `${this.position}px`;
    }

    getRandomObstacleInterval() {
        return (
            Math.random() * (this.maxObstacleInterval - this.minObstacleInterval) + this.minObstacleInterval
        );
    }

    updateDifficulty() {
        // Increase difficulty as score increases
        this.difficulty = 1 + Math.floor(this.score / 100);
    }

    getCurrentMinGap() {
        // Decrease gap as difficulty increases, but not below minGapLimit
        return Math.max(this.baseMinGap - (this.difficulty - 1) * 20, this.minGapLimit);
    }

    getCurrentSpawnInterval() {
        // Decrease interval as difficulty increases, but not below spawnIntervalLimit
        return Math.max(this.baseSpawnInterval - (this.difficulty - 1) * 100, this.spawnIntervalLimit);
    }

    getNextObstacleDistance() {
        // Use same gap for all screens
        if (this.score < 500) {
            const minGap = 500;  // Increased from 380 for easier start
            const maxGap = 650;  // Increased from 520 for easier start
            return Math.random() * (maxGap - minGap) + minGap;
        } else {
            // Gradually increase difficulty after 500, but keep easier
            const extra = Math.min(this.score - 500, 1000); // cap for sanity
            const minGap = Math.max(200, 500 - extra * 0.08); // Adjusted from 380
            const maxGap = Math.max(minGap + 60, 650 - extra * 0.07); // Adjusted from 520
            return Math.random() * (maxGap - minGap) + minGap;
        }
    }

    createObstacle() {
        // Always spawn if no obstacles (first spawn)
        if (this.obstacles.length === 0) {
            this.lastObstacleX = this.gameContainer.offsetWidth;
        }
        const rightmost = this.lastObstacleX;
        if (rightmost < this.gameContainer.offsetWidth - this.nextObstacleDistance || this.obstacles.length === 0) {
            let groupCount = 1;
            if (this.score < 500) {
                if (Math.random() < 0.03) groupCount = 3;  // Reduced from 0.05
                else if (Math.random() < 0.05) groupCount = 2;  // Reduced from 0.08
            } else {
                if (Math.random() < 0.12) groupCount = 3;
                else if (Math.random() < 0.18) groupCount = 2;
            }
            const cactusSizes = [
                { w: 40, h: 80, img: 'assets/cactus.png' },
                { w: 60, h: 80, img: 'assets/cactus2.png' },
                { w: 80, h: 80, img: 'assets/cactus3.png' }
            ];
            let left = this.gameContainer.offsetWidth + 10;
            for (let i = 0; i < groupCount; i++) {
                const type = Math.floor(Math.random() * 3);
                let { w, h, img } = cactusSizes[type];
                if (window.innerWidth <= 600) {
                    // Set all obstacles to match dino height in mobile
                    h = 48;
                    w = 28 + type * 10; // Slight width variation for each type
                }
                const obstacle = document.createElement('div');
                const typeNames = ['cactus1', 'cactus2', 'cactus3'];
                obstacle.className = 'obstacle ' + typeNames[type];
                obstacle.style.left = `${left}px`;
                obstacle.style.width = `${w}px`;
                obstacle.style.height = `${h}px`;
                obstacle.style.bottom = `${window.innerWidth <= 600 ? Math.round(this.gameContainer.offsetHeight * 0.10) : 50}px`;
                obstacle.style.backgroundImage = `url('${img}')`;
                obstacle.style.backgroundSize = 'contain';
                obstacle.style.backgroundRepeat = 'no-repeat';
                obstacle.style.backgroundPosition = 'bottom';
                obstacle.style.backgroundColor = 'transparent';
                this.gameContainer.appendChild(obstacle);
                this.obstacles.push(obstacle);
                left += w + 8;
            }
            this.lastObstacleX = left;
            this.nextObstacleDistance = this.getNextObstacleDistance();
        }
    }

    updateObstacles() {
        let rightmost = 0;
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            let currentLeft = parseFloat(obstacle.style.left);
            currentLeft -= this.currentSpeed;
            obstacle.style.left = `${currentLeft}px`;
            if (currentLeft > rightmost) rightmost = currentLeft + parseFloat(obstacle.style.width);
            // Remove obstacles that are off-screen
            if (currentLeft < -40) {
                obstacle.remove();
                this.obstacles.splice(i, 1);
                continue;
            }
            // Check for collision
            if (!this.isInvincible && this.checkCollision(obstacle)) {
                this.gameOver();
            }
        }
        this.lastObstacleX = rightmost;
    }

    checkCollision(obstacle) {
        const dinoRect = this.dino.getBoundingClientRect();
        const obstacleRect = obstacle.getBoundingClientRect();

        // Use different shrink values for mobile
        const isMobile = window.innerWidth <= 600;
        const dinoShrink = isMobile ? 10 : 15;
        const obsShrink = isMobile ? 16 : 22;
        const dinoBox = {
            left: dinoRect.left + dinoShrink,
            right: dinoRect.right - dinoShrink,
            top: dinoRect.top + dinoShrink,
            bottom: dinoRect.bottom - dinoShrink
        };

        const obsBox = {
            left: obstacleRect.left + obsShrink,
            right: obstacleRect.right - obsShrink,
            top: obstacleRect.top + obsShrink,
            bottom: obstacleRect.bottom - obsShrink
        };

        return !(
            dinoBox.right < obsBox.left ||
            dinoBox.left > obsBox.right ||
            dinoBox.bottom < obsBox.top ||
            dinoBox.top > obsBox.bottom
        );
    }

    gameOver() {
        this.isGameOver = true;
        this.gameOverElement.classList.remove('hidden');
        // Show dino-hit animation
        this.dino.classList.remove('dino-running', 'dino-jumping');
        this.dino.classList.add('dino-hit');
        this.dino.style.backgroundImage = "url('assets/dino-hit.png')";
        // Play game over sound
        if (this.sounds.gameover) { this.sounds.gameover.currentTime = 0; this.sounds.gameover.play(); }
    }

    updateScore() {
        const now = performance.now();
        if (now - this.lastScoreUpdateTime >= this.scoreInterval) {
            // Add points based on how many intervals have passed
            const intervals = Math.floor((now - this.lastScoreUpdateTime) / this.scoreInterval);
            this.score += intervals;
            // Format score as five-digit number
            const formatted = this.score.toString().padStart(5, '0');
            this.scoreElement.textContent = `Score: ${formatted}`;
            this.lastScoreUpdateTime += intervals * this.scoreInterval;
        }
    }

    resetGame() {
        this.isGameOver = false;
        this.score = 0;
        this.scoreElement.textContent = 'Score: 00000';
        this.gameOverElement.classList.add('hidden');
        this.position = 45;
        this.velocity = 0;
        this.dino.style.bottom = window.innerWidth <= 600 ? '20px' : '45px';
        // Set dino size based on screen width
        if (window.innerWidth <= 600) {
            this.dino.style.width = DINO_FRAME_WIDTH_MOBILE + 'px';
            this.dino.style.height = DINO_FRAME_HEIGHT_MOBILE + 'px';
        } else {
            this.dino.style.width = DINO_FRAME_WIDTH_DESKTOP + 'px';
            this.dino.style.height = DINO_FRAME_HEIGHT_DESKTOP + 'px';
        }
        this.lastScoreUpdateTime = performance.now();
        this.obstacles.forEach(obstacle => obstacle.remove());
        this.obstacles = [];
        this.clouds.forEach(cloud => cloud.remove());
        this.clouds = [];
        this.backgroundPosition = 0;
        this.gameContainer.style.backgroundPosition = '0px 0';
        this.currentSpeed = this.obstacleSpeed;
        this.dino.classList.remove('dino-jumping', 'dino-hit', 'invincible');
        this.dino.classList.add('dino-running');
        this.dino.style.backgroundImage = "url('assets/dino-run.png')";
        // Golden egg reset
        if (this.goldenEgg) {
            this.goldenEgg.remove();
            this.goldenEgg = null;
        }
        this.isPaused = false;
        document.getElementById('quiz-modal').style.display = 'none';
        
        // Reset rocket dino
        if (this.rocketDino) {
            this.rocketDino.remove();
            this.rocketDino = null;
        }
        this.isBoosting = false;
        if (this.boostTimeout) clearTimeout(this.boostTimeout);
        this.currentSpeed = this.obstacleSpeed;
        this.dino.classList.remove('dino-boosting');
        // Ensure obstacles spawn after reset
        this.lastObstacleX = this.gameContainer.offsetWidth;
        this.eggCount = 0;
        const eggCountElem = document.getElementById('egg-count');
        if (eggCountElem) eggCountElem.textContent = this.eggCount;
    }

    createCloud() {
        const now = performance.now();
        if (now - this.lastCloudTime >= this.cloudInterval) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud';
            
            // Random height for cloud
            const height = Math.random() * (this.maxCloudHeight - this.minCloudHeight) + this.minCloudHeight;
            cloud.style.top = `${height}px`;
            cloud.style.left = `${this.gameContainer.offsetWidth}px`;
            
            // Random scale for variety
            const scale = 0.5 + Math.random() * 0.5;
            cloud.style.transform = `scale(${scale})`;
            
            this.gameContainer.appendChild(cloud);
            this.clouds.push(cloud);
            this.lastCloudTime = now;
        }
    }

    updateClouds() {
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const cloud = this.clouds[i];
            let currentLeft = parseFloat(cloud.style.left);
            currentLeft -= this.cloudSpeed;
            cloud.style.left = `${currentLeft}px`;
            
            // Remove clouds that are off-screen
            if (currentLeft < -200) {
                cloud.remove();
                this.clouds.splice(i, 1);
            }
        }
    }

    updateBackground() {
        this.backgroundPosition -= this.backgroundSpeed;
        this.gameContainer.style.backgroundPosition = `${this.backgroundPosition}px 0`;
    }

    getNextEggTime() {
        // Random interval: every 5-15 seconds
        return performance.now() + 5000 + Math.random() * 10000;
    }

    spawnGoldenEgg() {
        // Don't spawn if there's already a golden egg
        if (this.goldenEgg) return;

        // Don't spawn if there are no obstacles
        if (this.obstacles.length === 0) return;

        // Get the last obstacle's position
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        const lastObstacleLeft = parseFloat(lastObstacle.style.left);
        const lastObstacleWidth = parseFloat(lastObstacle.style.width);
        const minDistance = 250; // Minimum distance from last obstacle
        // Get ground height dynamically
        let groundHeight = 50;
        if (this.ground) {
            const groundRect = this.ground.getBoundingClientRect();
            groundHeight = groundRect.height;
        }
        // Calculate spawn X: always at least off-screen to the right
        const spawnX = Math.max(
            lastObstacleLeft + lastObstacleWidth + minDistance,
            this.gameContainer.offsetWidth + minDistance
        );
        // Create golden egg with position after the last obstacle
        this.goldenEgg = {
            element: document.createElement('div'),
            x: spawnX,
            y: 0,
            width: window.innerWidth <= 600 ? 16 : 40,
            height: window.innerWidth <= 600 ? 18 : 40,
            collected: false
        };
        // Style the golden egg
        this.goldenEgg.element.className = 'golden-egg';
        this.goldenEgg.element.style.width = this.goldenEgg.width + 'px';
        this.goldenEgg.element.style.height = this.goldenEgg.height + 'px';
        this.goldenEgg.element.style.backgroundImage = 'url("assets/goldenegg.png")';
        this.goldenEgg.element.style.backgroundSize = 'contain';
        this.goldenEgg.element.style.backgroundRepeat = 'no-repeat';
        this.goldenEgg.element.style.position = 'absolute';
        this.goldenEgg.element.style.bottom = groundHeight + 'px';
        this.goldenEgg.element.style.left = spawnX + 'px';
        this.goldenEgg.element.style.zIndex = '2';
        // Add to game container
        this.gameContainer.appendChild(this.goldenEgg.element);
    }

    updateGoldenEgg() {
        if (!this.goldenEgg) return;
        let currentLeft = parseFloat(this.goldenEgg.element.style.left);
        currentLeft -= this.currentSpeed;
        this.goldenEgg.element.style.left = `${currentLeft}px`;
        // Remove if off screen
        if (currentLeft < -60) {
            this.goldenEgg.element.remove();
            this.goldenEgg = null;
            this.nextEggTime = this.getNextEggTime();
            return;
        }
        // Check collision
        if (this.checkEggCollision(this.goldenEgg.element)) {
            this.handleEggCollision();
        }
    }

    checkEggCollision(egg) {
        const dinoRect = this.dino.getBoundingClientRect();
        const eggRect = egg.getBoundingClientRect();
        // Use similar shrink as obstacles
        const dinoShrink = 13;
        const dinoBox = {
            left: dinoRect.left + dinoShrink,
            right: dinoRect.right - dinoShrink,
            top: dinoRect.top + dinoShrink,
            bottom: dinoRect.bottom - dinoShrink
        };
        const eggShrink = 10;
        const eggBox = {
            left: eggRect.left + eggShrink,
            right: eggRect.right - eggShrink,
            top: eggRect.top + eggShrink,
            bottom: eggRect.bottom - eggShrink
        };
        return !(
            dinoBox.right < eggBox.left ||
            dinoBox.left > eggBox.right ||
            dinoBox.bottom < eggBox.top ||
            dinoBox.top > eggBox.bottom
        );
    }

    handleEggCollision() {
        if (!this.goldenEgg) return;
        this.goldenEgg.element.remove();
        this.goldenEgg = null;
        this.pauseGameForQuiz();
    }

    pauseGameForQuiz() {
        this.quizActive = true;
        this.isPaused = true;
        this.showQuizModal();
    }

    resetQuizPool() {
        // Shuffle questions and reset pointer
        this.quizPool = this.quizQuestions.slice();
        for (let i = this.quizPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.quizPool[i], this.quizPool[j]] = [this.quizPool[j], this.quizPool[i]];
        }
        this.quizIndex = 0;
    }

    getNextQuizQuestion() {
        if (this.quizIndex >= this.quizPool.length) {
            this.resetQuizPool();
        }
        return this.quizPool[this.quizIndex++];
    }

    showQuizModal() {
        const modal = document.getElementById('quiz-modal');
        const questionObj = this.getNextQuizQuestion();
        modal.style.display = 'block';
        modal.innerHTML = `
            <h2>Gold Egg Quiz!</h2>
            <div class="quiz-divider"></div>
            <div id="quiz-question">${questionObj.question}</div>
            <div class="quiz-options"></div>
        `;
        const optionsDiv = modal.querySelector('.quiz-options');
        optionsDiv.classList.remove('centered');
        const letters = ['A', 'B', 'C', 'D'];
        questionObj.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            
            // Add click handler for keyboard/mouse
            btn.onclick = () => this.handleQuizAnswer(idx === questionObj.answer);
            
            // Add touch handlers for mobile
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                // If not selected, highlight and set as selected
                if (this.selectedQuizOption !== idx) {
                    // Remove highlight from all
                    const allBtns = btn.parentNode.querySelectorAll('.quiz-option-btn');
                    allBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedQuizOption = idx;
                } else {
                    // Second tap on same option: submit
                    this.handleQuizAnswer(idx === questionObj.answer);
                }
            });
            
            const letterSpan = document.createElement('span');
            letterSpan.className = 'option-letter';
            letterSpan.textContent = letters[idx];
            btn.appendChild(letterSpan);
            btn.appendChild(document.createTextNode(opt.replace(/^\w\)\s*/, '')));
            optionsDiv.appendChild(btn);
        });
    }

    handleQuizAnswer(correct) {
        const modal = document.getElementById('quiz-modal');
        const questionText = modal.querySelector('#quiz-question').textContent;
        // Find the current question object
        const questionObj = this.quizQuestions.find(q => q.question === questionText);
        // Remove options and center feedback
        const optionsDiv = modal.querySelector('.quiz-options');
        optionsDiv.innerHTML = '';
        optionsDiv.classList.add('centered');
        // Feedback message
        let feedback = '';
        if (correct) {
            feedback = `<div class='quiz-feedback' style='color: #4caf50;'>Correct!</div>`;
            // Play correct answer sound
            if (this.sounds.correctchoice) { this.sounds.correctchoice.currentTime = 0; this.sounds.correctchoice.play(); }
        } else {
            const letters = ['A', 'B', 'C', 'D'];
            feedback = `<div class='quiz-feedback' style='color: #e53935;'>Wrong!</div>` +
                `<div class='quiz-feedback' style='color:#111; font-weight:bold;'>Correct answer: <span style='color:#bfa100;'>${letters[questionObj.answer]}</span> ${questionObj.options[questionObj.answer].replace(/^[\w\)]\s*/, '')}</div>`;
            // Play wrong answer sound
            if (this.sounds.wrongchoice) { this.sounds.wrongchoice.currentTime = 0; this.sounds.wrongchoice.play(); }
        }
        optionsDiv.innerHTML = feedback + `<div id='resume-countdown' class='quiz-feedback' style='color:#444; font-weight:normal; margin-top:18px;'></div>`;
        let countdown = 3;
        const countdownDiv = modal.querySelector('#resume-countdown');
        countdownDiv.textContent = `Resuming in ${countdown}...`;
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                countdownDiv.textContent = `Resuming in ${countdown}...`;
            } else {
                clearInterval(countdownInterval);
                modal.style.display = 'none';
                this.quizActive = false;
                this.isPaused = false;
                if (correct) {
                    this.eggCount++;
                    document.getElementById('egg-count').textContent = this.eggCount;
                    this.setInvincible(8000); // 8 seconds
                }
                this.nextEggTime = this.getNextEggTime();
            }
        }, 1000);
    }

    setInvincible(ms) {
        this.isInvincible = true;
        this.dino.classList.add('invincible');
        // Hide rocket timer if visible
        const rocketTimerDiv = document.getElementById('rocket-invincible-timer');
        rocketTimerDiv.style.display = 'none';
        // Invincibility countdown UI
        const timerDiv = document.getElementById('invincible-timer');
        let seconds = Math.ceil(ms / 1000);
        timerDiv.innerHTML = `<img src='assets/shield.png' style='height:32px;vertical-align:middle;margin-right:8px;'> <span id='inv-sec'>${seconds}</span>s`;
        timerDiv.style.display = 'block';
        // Play shield sound
        if (this.sounds.shield) { this.sounds.shield.currentTime = 0; this.sounds.shield.play(); }
        if (this.invincibleTimeout) clearTimeout(this.invincibleTimeout);
        if (this.invincibleInterval) clearInterval(this.invincibleInterval);
        this.invincibleInterval = setInterval(() => {
            seconds--;
            if (seconds > 0) {
                const secSpan = document.getElementById('inv-sec');
                if (secSpan) secSpan.textContent = seconds;
            } else {
                clearInterval(this.invincibleInterval);
            }
        }, 1000);
        this.invincibleTimeout = setTimeout(() => {
            this.isInvincible = false;
            this.dino.classList.remove('invincible');
            timerDiv.style.display = 'none';
            if (this.invincibleInterval) clearInterval(this.invincibleInterval);
        }, ms);
    }

    getNextRocketTime() {
        // Random interval: every 15-25 seconds
        return performance.now() + 15000 + Math.random() * 10000;
    }

    spawnRocketDino() {
        if (this.rocketDino) return;
        const containerHeight = this.gameContainer.offsetHeight;
        // Get ground height dynamically
        let groundHeight = 50;
        if (this.ground) {
            const groundRect = this.ground.getBoundingClientRect();
            groundHeight = groundRect.height;
        }
        // Set rocket dino height (should match .rocket-dino CSS)
        const rocketHeight = window.innerWidth <= 600 ? 25 : 70; // px
        const rocketWidth = window.innerWidth <= 600 ? 25 : 70; // px
        const offsetAboveGround = window.innerWidth <= 600 ? 90 : 120; // px
        const top = containerHeight - groundHeight - rocketHeight - offsetAboveGround;
        const rocket = document.createElement('div');
        rocket.className = 'rocket-dino';
        rocket.style.left = `${this.gameContainer.offsetWidth}px`;
        rocket.style.top = `${top}px`;
        rocket.style.width = rocketWidth + 'px';
        rocket.style.height = rocketHeight + 'px';
        this.gameContainer.appendChild(rocket);
        this.rocketDino = rocket;
    }

    updateRocketDino() {
        if (!this.rocketDino) return;
        
        let currentLeft = parseFloat(this.rocketDino.style.left);
        currentLeft -= this.currentSpeed;
        this.rocketDino.style.left = `${currentLeft}px`;
        
        // Remove if off screen
        if (currentLeft < -60) {
            this.rocketDino.remove();
            this.rocketDino = null;
            this.nextRocketTime = this.getNextRocketTime();
            return;
        }
        
        // Check collision
        if (this.checkRocketCollision(this.rocketDino)) {
            this.handleRocketCollision();
        }
    }

    checkRocketCollision(rocket) {
        const dinoRect = this.dino.getBoundingClientRect();
        const rocketRect = rocket.getBoundingClientRect();
        
        const dinoShrink = 13;
        const dinoBox = {
            left: dinoRect.left + dinoShrink,
            right: dinoRect.right - dinoShrink,
            top: dinoRect.top + dinoShrink,
            bottom: dinoRect.bottom - dinoShrink
        };
        
        const rocketShrink = 10;
        const rocketBox = {
            left: rocketRect.left + rocketShrink,
            right: rocketRect.right - rocketShrink,
            top: rocketRect.top + rocketShrink,
            bottom: rocketRect.bottom - rocketShrink
        };
        
        return !(
            dinoBox.right < rocketBox.left ||
            dinoBox.left > rocketBox.right ||
            dinoBox.bottom < rocketBox.top ||
            dinoBox.top > rocketBox.bottom
        );
    }

    handleRocketCollision() {
        if (!this.rocketDino) return;
        
        this.rocketDino.remove();
        this.rocketDino = null;
        this.activateBoost();
    }

    activateBoost() {
        if (this.isBoosting) return;
        
        this.isBoosting = true;
        this.dino.classList.add('dino-boosting');
        // Play rocket thrust sound
        if (this.sounds.rocketthrust) { this.sounds.rocketthrust.currentTime = 0; this.sounds.rocketthrust.play(); }
        // Start sparkle trail
        this.startSparkleTrail();
        // Set dino boost size for mobile
        if (window.innerWidth <= 600) {
            this.dino.style.width = '80px';
            this.dino.style.height = '80px';
        }
        
        // First phase: Pick up rocket and float to mid-air
        const startHeight = this.position;
        const targetHeight = 300;
        const floatDuration = 500; // 0.5 seconds to float up
        const startTime = performance.now();
        
        const floatUp = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / floatDuration, 1);
            
            // Ease out cubic for smooth deceleration
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            this.position = startHeight + (targetHeight - startHeight) * easeProgress;
            this.dino.style.bottom = `${this.position}px`;
            
            if (progress < 1) {
                requestAnimationFrame(floatUp);
            } else {
                // Start boost phase
                this.currentSpeed = this.boostSpeed;
                // Keep dino at target height
                this.position = targetHeight;
                this.dino.style.bottom = `${this.position}px`;
                // End boost after 3 seconds
                if (this.boostTimeout) clearTimeout(this.boostTimeout);
                this.boostTimeout = setTimeout(() => {
                    // Start invincibility before dropping
                    this.setRocketInvincible(2000);
                    this.endBoost();
                }, 3000);
            }
        };
        
        requestAnimationFrame(floatUp);
    }

    setRocketInvincible(ms) {
        this.isInvincible = true;
        this.dino.classList.add('invincible');
        // Hide golden egg timer if visible
        const eggTimerDiv = document.getElementById('invincible-timer');
        eggTimerDiv.style.display = 'none';
        // Use the rocket-specific timer
        const timerDiv = document.getElementById('rocket-invincible-timer');
        let seconds = 2; // Start from 2 seconds
        timerDiv.innerHTML = `<img src='assets/shield.png' style='height:32px;vertical-align:middle;margin-right:8px;'> <span id='rocket-inv-sec'>${seconds}</span>s`;
        timerDiv.style.display = 'block';
        
        // Clear any existing timers
        if (this.invincibleTimeout) clearTimeout(this.invincibleTimeout);
        if (this.invincibleInterval) clearInterval(this.invincibleInterval);
        
        // Update countdown every second
        this.invincibleInterval = setInterval(() => {
            seconds--;
            const secSpan = document.getElementById('rocket-inv-sec');
            if (secSpan) secSpan.textContent = seconds;
        }, 1000);
        
        // Remove invincibility after 2 seconds
        this.invincibleTimeout = setTimeout(() => {
            this.isInvincible = false;
            this.dino.classList.remove('invincible');
            timerDiv.style.display = 'none';
            if (this.invincibleInterval) clearInterval(this.invincibleInterval);
        }, 2000);
    }

    endBoost() {
        // Remove boost class and reset speed
        this.isBoosting = false;
        this.dino.classList.remove('dino-boosting');
        // Stop sparkle trail
        this.stopSparkleTrail();
        this.currentSpeed = this.originalSpeed;
        // Reset dino size after boost
        if (window.innerWidth <= 600) {
            this.dino.style.width = DINO_FRAME_WIDTH_MOBILE + 'px';
            this.dino.style.height = DINO_FRAME_HEIGHT_MOBILE + 'px';
        } else {
            this.dino.style.width = DINO_FRAME_WIDTH_DESKTOP + 'px';
            this.dino.style.height = DINO_FRAME_HEIGHT_DESKTOP + 'px';
        }
        // Drop down phase
        const startHeight = this.position;
        const targetHeight = 45; // Ground level
        const dropDuration = 800; // 0.8 seconds to drop down
        const startTime = performance.now();
        
        const dropDown = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / dropDuration, 1);
            
            // Ease in cubic for smooth acceleration
            const easeProgress = progress * progress * progress;
            this.position = startHeight + (targetHeight - startHeight) * easeProgress;
            this.dino.style.bottom = `${this.position}px`;
            
            if (progress < 1) {
                requestAnimationFrame(dropDown);
            } else {
                // Ensure final position
                this.position = targetHeight;
                this.dino.style.bottom = `${this.position}px`;
                this.isOnGround = true;
            }
        };
        
        requestAnimationFrame(dropDown);
    }

    // --- Sparkle Trail Methods ---
    startSparkleTrail() {
        if (this.sparkleInterval) return;
        this.sparkleInterval = setInterval(() => {
            // Only spawn if dino is boosting
            if (!this.isBoosting) return;
            const dinoRect = this.dino.getBoundingClientRect();
            const containerRect = this.gameContainer.getBoundingClientRect();
            // Place sparkle behind dino (left side)
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            // Randomize vertical position a bit
            const offsetY = 28 + Math.random() * (dinoRect.height - 40);
            // Randomize horizontal offset for natural trail
            const offsetX = -12 - Math.random() * 24; // 12 to 36px behind dino
            sparkle.style.left = (dinoRect.left - containerRect.left + offsetX) + 'px';
            sparkle.style.top = (dinoRect.top - containerRect.top + offsetY) + 'px';
            // Randomize horizontal drift in animation
            const drift = (Math.random() - 0.5) * 32; // -16px to +16px
            sparkle.style.setProperty('--sparkle-x', `${drift}px`);
            this.gameContainer.appendChild(sparkle);
            // Remove after animation
            setTimeout(() => { sparkle.remove(); }, 700);
        }, 60); // ~16 sparkles per second
    }

    stopSparkleTrail() {
        if (this.sparkleInterval) {
            clearInterval(this.sparkleInterval);
            this.sparkleInterval = null;
        }
        // Remove any remaining sparkles
        const sparkles = this.gameContainer.querySelectorAll('.sparkle');
        sparkles.forEach(s => s.remove());
    }

    gameLoop() {
        if (!this.isGameOver && !this.isPaused) {
            this.updateDino();
            this.createObstacle();
            this.updateObstacles();
            this.createCloud();
            this.updateClouds();
            this.updateBackground();
            this.updateScore();
            this.updateDifficulty();
            
            // Golden egg logic
            if (performance.now() > this.nextEggTime && !this.goldenEgg) {
                this.spawnGoldenEgg();
            }
            this.updateGoldenEgg();
            
            // Rocket dino logic
            if (performance.now() > this.nextRocketTime && !this.rocketDino) {
                this.spawnRocketDino();
            }
            this.updateRocketDino();
            
            // Accelerate speed (only if not boosting)
            if (!this.isBoosting) {
                this.currentSpeed = Math.min(this.currentSpeed + this.acceleration, this.maxSpeed);
            }
        }
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    const startPopup = document.getElementById('start-popup');

    // Hide game container and start popup initially
    gameContainer.style.display = 'none';
    startPopup.style.display = 'none';

    // Show loading screen for 3 seconds
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        // Show start popup
        startPopup.style.display = 'flex';
        // Set white background for start screen on mobile
        if (window.innerWidth <= 600) {
            document.body.classList.add('start-screen-bg');
        }
        // Wait for user input to start the game
        const startGame = () => {
            startPopup.style.display = 'none';
            gameContainer.style.display = 'block';
            // Remove white background, show game background
            if (window.innerWidth <= 600) {
                document.body.classList.remove('start-screen-bg');
            }
            new DinoGame();
            document.removeEventListener('keydown', onKeyDown);
            startPopup.removeEventListener('touchstart', onTouchStart);
        };
        const onKeyDown = (e) => {
            if (e.code === 'Space') {
                startGame();
            }
        };
        const onTouchStart = (e) => {
            e.preventDefault();
            startGame();
        };
        document.addEventListener('keydown', onKeyDown);
        startPopup.addEventListener('touchstart', onTouchStart);
    }, 3000);
});

// Dino frame size constants
const DINO_FRAME_WIDTH_DESKTOP = 120; // px
const DINO_FRAME_HEIGHT_DESKTOP = 100; // px
const DINO_FRAME_WIDTH_MOBILE = 78; // px (adjust as needed)
const DINO_FRAME_HEIGHT_MOBILE = 68; // px (adjust as needed)

// Set dino size based on screen width before game starts
function setInitialDinoSize() {
    const dino = document.getElementById('dino');
    if (!dino) return;
    if (window.innerWidth <= 600) {
        dino.style.width = DINO_FRAME_WIDTH_MOBILE + 'px';
        dino.style.height = DINO_FRAME_HEIGHT_MOBILE + 'px';
    } else {
        dino.style.width = DINO_FRAME_WIDTH_DESKTOP + 'px';
        dino.style.height = DINO_FRAME_HEIGHT_DESKTOP + 'px';
    }
}

setInitialDinoSize();
window.addEventListener('resize', setInitialDinoSize); 