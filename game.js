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
        this.position = 45;
        this.obstacles = [];
        this.obstacleSpeed = 6.5; // initial speed
        this.currentSpeed = 6.5; // for acceleration
        this.maxSpeed = 10;
        this.acceleration = 0.0001;
        this.lastObstacleTime = 0;
        this.minObstacleInterval = 800; // ms
        this.maxObstacleInterval = 1600; // ms
        this.nextObstacleInterval = this.getRandomObstacleInterval();
        this.isOnGround = true;
        this.lastScoreUpdateTime = performance.now();
        this.scoreInterval = 50; // ms, fast arcade style
        this.difficulty = 1;
        this.baseMinGap = 250; // px, easy start
        this.minGapLimit = 110; // px, never go below this
        this.baseSpawnInterval = 1600; // ms, easy start
        this.spawnIntervalLimit = 600; // ms, never go below this
        this.lastObstacleRight = window.innerWidth; // track rightmost obstacle
        this.distanceTraveled = 0;
        this.lastObstacleX = window.innerWidth;
        this.nextObstacleDistance = this.getNextObstacleDistance();
        this.level1JumpForce = 15; // Level 1 jump force (easy to adjust)
        this.level2JumpForce = 20; // Level 2 max jump force (easy to adjust)
        
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
        // Track used questions
        this.resetQuizPool();
        
        // Rocket dino properties
        this.rocketDino = null;
        this.nextRocketTime = this.getNextRocketTime();
        this.isBoosting = false;
        this.boostTimeout = null;
        this.originalSpeed = this.obstacleSpeed;
        this.boostSpeed = this.obstacleSpeed * 2.5;
        
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

        // Touch controls
        this.gameContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.isGameOver) {
                this.resetGame();
            } else if (!this.isJumping && this.isOnGround) {
                this.startJump();
            }
        });

        this.gameContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.isJumping) {
                this.releaseJump();
            }
        });
    }

    startJump() {
        this.isJumping = true;
        this.isOnGround = false;
        this.jumpCharge = 0;
        this.jumpStartTime = performance.now();
        // Remove running animation and add jumping sprite
        this.dino.classList.remove('dino-running');
        this.dino.classList.add('dino-jumping');
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
        // Make it easier before 500 score
        if (this.score < 500) {
            const minGap = 380;
            const maxGap = 520;
            return Math.random() * (maxGap - minGap) + minGap;
        } else {
            // Gradually increase difficulty after 500, but keep easier
            const extra = Math.min(this.score - 500, 1000); // cap for sanity
            const minGap = Math.max(200, 380 - extra * 0.08);
            const maxGap = Math.max(minGap + 60, 520 - extra * 0.07);
            return Math.random() * (maxGap - minGap) + minGap;
        }
    }

    createObstacle() {
        // Use distance-based spawning
        const rightmost = this.lastObstacleX;
        if (rightmost < window.innerWidth - this.nextObstacleDistance) {
            // Randomly pick group size, but make groups less frequent
            let groupCount = 1;
            if (this.score < 500) {
                if (Math.random() < 0.05) groupCount = 3;
                else if (Math.random() < 0.08) groupCount = 2;
            } else {
                if (Math.random() < 0.12) groupCount = 3;
                else if (Math.random() < 0.18) groupCount = 2;
            }
            const cactusSizes = [
                { w: 40, h: 80, img: 'assets/cactus.png' },
                { w: 60, h: 80, img: 'assets/cactus2.png' },
                { w: 80, h: 80, img: 'assets/cactus3.png' }
            ];
            let left = window.innerWidth + 10;
            for (let i = 0; i < groupCount; i++) {
                // Randomly pick cactus type for each obstacle
                const type = Math.floor(Math.random() * 3);
                const { w, h, img } = cactusSizes[type];
                const obstacle = document.createElement('div');
                obstacle.className = 'obstacle';
                obstacle.style.left = `${left}px`;
                obstacle.style.width = `${w}px`;
                obstacle.style.height = `${h}px`;
                obstacle.style.bottom = '50px';
                obstacle.style.backgroundImage = `url('${img}')`;
                obstacle.style.backgroundSize = 'contain';
                obstacle.style.backgroundRepeat = 'no-repeat';
                obstacle.style.backgroundPosition = 'bottom';
                obstacle.style.backgroundColor = 'transparent';
                this.gameContainer.appendChild(obstacle);
                this.obstacles.push(obstacle);
                left += w + 8; // 8px gap between grouped cacti
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

        // Shrink dino's collision box by 0px on each side
        const dinoShrink = 15;
        const dinoBox = {
            left: dinoRect.left + dinoShrink,
            right: dinoRect.right - dinoShrink,
            top: dinoRect.top + dinoShrink,
            bottom: dinoRect.bottom - dinoShrink
        };

        // Shrink obstacle's collision box by 0px on each side
        const obsShrink = 22;
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
        this.dino.style.bottom = '45px';
        this.dino.style.width = '120px';
        this.dino.style.height = '100px';
        this.lastScoreUpdateTime = performance.now();
        this.obstacles.forEach(obstacle => obstacle.remove());
        this.obstacles = [];
        this.clouds.forEach(cloud => cloud.remove());
        this.clouds = [];
        this.backgroundPosition = 0;
        this.gameContainer.style.backgroundPosition = '0 0';
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
    }

    createCloud() {
        const now = performance.now();
        if (now - this.lastCloudTime >= this.cloudInterval) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud';
            
            // Random height for cloud
            const height = Math.random() * (this.maxCloudHeight - this.minCloudHeight) + this.minCloudHeight;
            cloud.style.top = `${height}px`;
            cloud.style.left = `${window.innerWidth}px`;
            
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
        if (this.goldenEgg) return;
        // Find a clear spot (not overlapping with obstacles)
        let left = window.innerWidth + 10;
        let eggWidth = 60;
        let eggHeight = 80;
        let bottom = 30; // same as .golden-egg CSS
        // Check for overlap with obstacles
        let overlaps = false;
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            const obsLeft = parseFloat(obs.style.left);
            const obsRight = obsLeft + parseFloat(obs.style.width);
            // If the egg would overlap with this obstacle
            if (
                (left < obsRight && left + eggWidth > obsLeft)
            ) {
                overlaps = true;
                break;
            }
        }
        if (overlaps) {
            // Try again next frame
            this.nextEggTime = performance.now() + 100;
            return;
        }
        // Also check for obstacles that will reach the egg's spawn position soon
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            const obsLeft = parseFloat(obs.style.left);
            const obsRight = obsLeft + parseFloat(obs.style.width);
            // Predict if any obstacle will reach the egg's spawn position within 1 second
            const timeToReach = (left - obsRight) / this.currentSpeed;
            if (timeToReach > 0 && timeToReach < 60) { // 60 frames ~ 1 second
                overlaps = true;
                break;
            }
        }
        if (overlaps) {
            this.nextEggTime = performance.now() + 100;
            return;
        }
        const egg = document.createElement('div');
        egg.className = 'golden-egg';
        egg.style.left = `${left}px`;
        this.gameContainer.appendChild(egg);
        this.goldenEgg = egg;
    }

    updateGoldenEgg() {
        if (!this.goldenEgg) return;
        let currentLeft = parseFloat(this.goldenEgg.style.left);
        currentLeft -= this.currentSpeed;
        this.goldenEgg.style.left = `${currentLeft}px`;
        // Remove if off screen
        if (currentLeft < -60) {
            this.goldenEgg.remove();
            this.goldenEgg = null;
            this.nextEggTime = this.getNextEggTime();
            return;
        }
        // Check collision
        if (this.checkEggCollision(this.goldenEgg)) {
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
        this.goldenEgg.remove();
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
            btn.onclick = () => this.handleQuizAnswer(idx === questionObj.answer);
            const letterSpan = document.createElement('span');
            letterSpan.className = 'option-letter';
            letterSpan.textContent = letters[idx];
            btn.appendChild(letterSpan);
            btn.appendChild(document.createTextNode(opt.replace(/^\w\)\s*/, '')));
            optionsDiv.appendChild(btn);
        });
        // No timer: unlimited time to answer
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
        } else {
            const letters = ['A', 'B', 'C', 'D'];
            feedback = `<div class='quiz-feedback' style='color: #e53935;'>Wrong!</div>` +
                `<div class='quiz-feedback' style='color:#111; font-weight:bold;'>Correct answer: <span style='color:#bfa100;'>${letters[questionObj.answer]}</span> ${questionObj.options[questionObj.answer].replace(/^\w\)\s*/, '')}</div>`;
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
        
        // Find a clear spot in the air
        const height = 200 + Math.random() * 100; // Random height between 200-300px
        const rocket = document.createElement('div');
        rocket.className = 'rocket-dino';
        rocket.style.left = `${window.innerWidth}px`;
        rocket.style.top = `${height}px`;
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
        this.currentSpeed = this.originalSpeed;
        
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
    new DinoGame();
}); 