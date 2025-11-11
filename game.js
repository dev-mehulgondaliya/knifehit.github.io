// === SETTINGS FROM localStorage ===
let bgSoundEnabled = localStorage.getItem("bgSound") === "true";
let gameSoundEnabled = localStorage.getItem("gameSound") === "true";
let currentLevel = parseInt(localStorage.getItem("currentLevel")) || 1;

let bgMusic; // background music reference
let hitSound, collisionSound;

// the game itself
var game;

// Level configurations
const levelConfigs = {
  1: { // Basic gameplay
    rotationSpeed: 2,
    throwSpeed: 150,
    totalKnives: 6,
    minApples: 2,
    maxApples: 3,
    minAngleGap: 45,
    hasMovingApples: false,
    hasBonusFruits: false,
    hasObstacles: false,
    hasVariableSpeed: false
  },
  2: { // Slightly harder
    rotationSpeed: 3,
    throwSpeed: 150,
    totalKnives: 5,
    minApples: 3,
    maxApples: 4,
    minAngleGap: 40,
    hasMovingApples: false,
    hasBonusFruits: false,
    hasObstacles: false,
    hasVariableSpeed: false
  },
  3: { // Moving apples
    rotationSpeed: 3.5,
    throwSpeed: 150,
    totalKnives: 5,
    minApples: 3,
    maxApples: 4,
    minAngleGap: 35,
    hasMovingApples: true,
    hasBonusFruits: false,
    hasObstacles: false,
    hasVariableSpeed: false
  },
  4: { // Bonus fruits
    rotationSpeed: 4,
    throwSpeed: 150,
    totalKnives: 4,
    minApples: 2,
    maxApples: 4,
    minAngleGap: 35,
    hasMovingApples: true,
    hasBonusFruits: true,
    hasObstacles: false,
    hasVariableSpeed: false
  },
  5: { // Faster & asymmetric
    rotationSpeed: 4.5,
    throwSpeed: 150,
    totalKnives: 4,
    minApples: 3,
    maxApples: 5,
    minAngleGap: 30,
    hasMovingApples: true,
    hasBonusFruits: true,
    hasObstacles: false,
    hasVariableSpeed: false
  },
  6: { // Obstacles
    rotationSpeed: 4,
    throwSpeed: 150,
    totalKnives: 5,
    minApples: 2,
    maxApples: 4,
    minAngleGap: 40,
    hasMovingApples: true,
    hasBonusFruits: true,
    hasObstacles: true,
    hasVariableSpeed: false
  },
  7: { // Dynamic fruits
    rotationSpeed: 4.5,
    throwSpeed: 150,
    totalKnives: 4,
    minApples: 2,
    maxApples: 4,
    minAngleGap: 35,
    hasMovingApples: true,
    hasBonusFruits: true,
    hasObstacles: true,
    hasVariableSpeed: false,
    hasDynamicFruits: true
  },
  8: { // Variable speed
    rotationSpeed: 5,
    throwSpeed: 150,
    totalKnives: 4,
    minApples: 3,
    maxApples: 5,
    minAngleGap: 30,
    hasMovingApples: true,
    hasBonusFruits: true,
    hasObstacles: true,
    hasVariableSpeed: true,
    hasDynamicFruits: true
  },
  9: { // Power-ups
    rotationSpeed: 5.5,
    throwSpeed: 150,
    totalKnives: 3,
    minApples: 3,
    maxApples: 5,
    minAngleGap: 30,
    hasMovingApples: true,
    hasBonusFruits: true,
    hasObstacles: true,
    hasVariableSpeed: true,
    hasDynamicFruits: true,
    hasPowerUps: true
  },
  10: { // Ultimate challenge
    rotationSpeed: 6,
    throwSpeed: 150,
    totalKnives: 3,
    minApples: 4,
    maxApples: 6,
    minAngleGap: 25,
    hasMovingApples: true,
    hasBonusFruits: true,
    hasObstacles: true,
    hasVariableSpeed: true,
    hasDynamicFruits: true,
    hasPowerUps: true
  }
};

// Current level configuration
const gameOptions = levelConfigs[currentLevel];


function PlayGame() {
  let canThrow = true;
  let knife;
  let target;
  let knifeGroup;
  let appleGroup;
  let remainingKnives;
  let knivesText;
  let fruitCutSound;

  const COLLISION_ANGLE_THRESHOLD = 15; // degrees

  // check if new knife hits existing one
  this.checkCollision = function (attachAngle) {
    let collided = false;
    knifeGroup.getChildren().forEach((child) => {
      const diff = Phaser.Math.Angle.WrapDegrees(attachAngle - child.angle);
      if (Math.abs(diff) < COLLISION_ANGLE_THRESHOLD) {
        collided = true;
      }
    });
    return collided;
  };

  // handle collision → all knives fall down, popup, then restart
  this.handleCollision = function () {
    canThrow = false;

    try {
      // read latest setting in case user changed it in settings screen
      gameSoundEnabled = localStorage.getItem("gameSound") === "true";
      if (gameSoundEnabled && collisionSound) collisionSound.play();
    } catch (e) {}

    const allKnives = knifeGroup.getChildren().concat([knife]);

    allKnives.forEach((k, index) => {
      this.tweens.add({
        targets: k,
        y: game.config.height + 200,
        angle: Phaser.Math.Between(-90, 90),
        duration: 600 + index * 80,
        ease: 'Cubic.easeIn',
      });
    });

    this.time.delayedCall(1000, () => {
      // show a nicer popup instead of native alert? keep simple for now
      if (confirm("💥 Game Over! All knives fell! Restart level?")) {
        // ensure bg music stops before restart
        if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
        window.location.reload();
      } else {
        if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
        localStorage.setItem("currentLevel", 1); // Reset to level 1
        window.location.reload();
      }
    });
  };

  // preload images + audio
  this.preload = function () {
  this.load.image("target", "assets/images/target.png");
  this.load.image("knife", "assets/images/knife.png");
  this.load.image("apple", "assets/images/apple.png"); // preload apple
  this.load.audio("bgMusic", "assets/audio/bg.mp3");
  this.load.audio("hit", "assets/audio/hit.mp3");
  this.load.audio("collision", "assets/audio/collision.mp3");
  this.load.image("apple_left", "assets/images/apple_left_side.png");
this.load.image("apple_right", "assets/images/apple_right_side.png");
this.load.audio("fruitCut", "assets/audio/fruit_cut.mp3");

  };

  // create objects
  this.create = function () {
    // re-read settings each time scene created
    bgSoundEnabled = localStorage.getItem("bgSound") === "true";
    gameSoundEnabled = localStorage.getItem("gameSound") === "true";
    
    // Create sound objects once
    fruitCutSound = this.sound.add("fruitCut", { volume: 1.0 });
    canThrow = true;

    // create Phaser sound objects
    hitSound = this.sound.add("hit");
    collisionSound = this.sound.add("collision");

    if (bgSoundEnabled) {
      bgMusic = this.sound.add("bgMusic", { loop: true, volume: 0.3 });
      bgMusic.play();
    } else {
      // ensure no music playing
      if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
    }

    // stop bgMusic on scene shutdown
    this.events.on('shutdown', () => {
      if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
    });

    knifeGroup = this.add.group();
    appleGroup = this.add.group(); // group to hold apples
    remainingKnives = gameOptions.totalKnives;

    knife = this.add.sprite(game.config.width / 2, (game.config.height / 5) *4, "knife");
    target = this.add.sprite(game.config.width / 2, 400, "target");
    target.depth = 1;

    // show level text
    this.add.text(
      game.config.width / 2,
      40,
      `Level ${currentLevel}`,
      {
        fontSize: "52px",
        color: "#ff6600",
        fontFamily: "Arial",
        align: "center",
        fontWeight: "bold"
      }
    ).setOrigin(0.5);

    // show remaining knives text
    knivesText = this.add.text(
      game.config.width / 2,
      100,
      `Knives Left: ${remainingKnives}`,
      {
        fontSize: "48px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "center",
      }
    ).setOrigin(0.5);

    // Add level-appropriate number of apples
let numApples = Phaser.Math.Between(gameOptions.minApples, gameOptions.maxApples);
let angleList = [];
const minAngleGap = gameOptions.minAngleGap; // Use level-specific gap

for (let i = 0; i < numApples; i++) {
  let attempts = 0;
  let angle;
  do {
    angle = Phaser.Math.Between(0, 359);
    attempts++;
    // Check angular gap with all current apples
  } while (
    angleList.some(a => Math.abs(Phaser.Math.Angle.WrapDegrees(angle - a)) < minAngleGap) &&
    attempts < 30
  );
  angleList.push(angle);
  const newApple = this.add.sprite(0, 0, "apple");
  newApple.setScale(0.10);

  newApple.angle = angle;
  const radians = Phaser.Math.DegToRad(angle + 90);

  const appleRadius = target.width / 2 + (newApple.displayHeight / 2) - 5;

  newApple.x = target.x + appleRadius * Math.cos(radians);
  newApple.y = target.y + appleRadius * Math.sin(radians);
  appleGroup.add(newApple);
}


    // input: click or tap to throw
    this.input.on("pointerdown", () => {
      if (canThrow && remainingKnives > 0) {
        canThrow = false;
        this.tweens.add({
          targets: knife,
          y: target.y + target.width / 2,
          duration: gameOptions.throwSpeed,
          callbackScope: this,
          onComplete: () => {
            const attachRad = Math.atan2(knife.y - target.y, knife.x - target.x);
            const attachAngle = Phaser.Math.RadToDeg(attachRad) - 90;

            if (this.checkCollision(attachAngle)) {
              this.handleCollision();
              return;
            }

            // play hit sound (use Phaser sound and user's setting)
            try {
              if (gameSoundEnabled && hitSound) hitSound.play();
            } catch (e) {}

            // attach knife to target
            const newKnife = this.add.sprite(0, 0, "knife");
            newKnife.angle = attachAngle;
            const radians = Phaser.Math.DegToRad(newKnife.angle + 90);
            const radius = target.width / 2;
            newKnife.x = target.x + radius * Math.cos(radians);
            newKnife.y = target.y + radius * Math.sin(radians);
            knifeGroup.add(newKnife);

            // check if knife hits any apple after sticking to target
            appleGroup.getChildren().forEach((apple) => {
              const dx = apple.x - target.x;
              const dy = apple.y - target.y;
              const appleAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) - 90;

              // compare with knife attach angle
              const diff = Phaser.Math.Angle.WrapDegrees(attachAngle - appleAngle);

if (Math.abs(diff) < 10) { // knife hits apple
    // Play sound immediately with no delay
    try {
      if (gameSoundEnabled && fruitCutSound) {
        fruitCutSound.stop(); // Stop any previous playback
        fruitCutSound.play(); // Play immediately
      }
    } catch (e) {
      // handle errors silently
    }

  // Hide (or destroy) original apple immediately
  apple.setVisible(false);

  // Create the two halves at the same position as the apple
  const leftHalf = this.add.sprite(apple.x, apple.y, "apple_left");
  const rightHalf = this.add.sprite(apple.x, apple.y, "apple_right");

  // Optionally scale to match original apple
  leftHalf.setScale(0.10);
  rightHalf.setScale(0.10);

  // Animate halves: move left and right, rotate, fade out
  this.tweens.add({
    targets: leftHalf,
    x: apple.x - 40, // move to left
    angle: apple.angle - 30, // slight spin
    alpha: 0, // fade out
    duration: 700,
    ease: "Cubic.easeOut",
    onComplete: () => leftHalf.destroy()
  });

  this.tweens.add({
    targets: rightHalf,
    x: apple.x + 40, // move to right
    angle: apple.angle + 30, // slight spin
    alpha: 0, // fade out
    duration: 700,
    ease: "Cubic.easeOut",
    onComplete: () => rightHalf.destroy()
  });

  // Finally destroy apple object
  apple.destroy();
}



            });

            // decrease knife count
            remainingKnives--;
            knivesText.setText(`Knives Left: ${remainingKnives}`);

            // check win condition
            if (remainingKnives === 0) {
              canThrow = false; // prevent further throws
              this.time.delayedCall(200, () => {
                if (currentLevel < 10) {
                  if (confirm(`🎉 Level ${currentLevel} Complete! Continue to Level ${currentLevel + 1}?`)) {
                    localStorage.setItem("currentLevel", currentLevel + 1);
                    if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
                    window.location.reload();
                  } else {
                    if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
                    localStorage.setItem("currentLevel", 1); // Reset to level 1
                    window.location.reload();
                  }
                } else {
                  if (confirm("🏆 Congratulations! You've completed all levels! Start over?")) {
                    localStorage.setItem("currentLevel", 1);
                    if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
                    window.location.reload();
                  } else {
                    if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
                    window.location.reload();
                  }
                }
              });
              return;
            }

            // reset for next throw
            knife.y = (game.config.height / 5) * 4;
            canThrow = true;
          },
        });
      }
    });
  };

  // update rotation
  this.update = function () {
    target.angle += gameOptions.rotationSpeed;

    // rotate knives
    knifeGroup.getChildren().forEach((child) => {
      child.angle += gameOptions.rotationSpeed;
      const radians = Phaser.Math.DegToRad(child.angle + 90);
      child.x = target.x + (target.width / 2) * Math.cos(radians);
      child.y = target.y + (target.width / 2) * Math.sin(radians);
    });

    // rotate apples
    appleGroup.getChildren().forEach((apple) => {
      apple.angle += gameOptions.rotationSpeed;
      const radians = Phaser.Math.DegToRad(apple.angle + 270);
      const appleRadius = target.width / 2 + (apple.displayHeight / 2) - 5;
      apple.x = target.x + appleRadius * Math.cos(radians);
      apple.y = target.y + appleRadius * Math.sin(radians);
    });
  };
}


// start game
window.onload = function () {
  var gameConfig = {
    type: Phaser.CANVAS,
    width: 750,
    height: 1334,
    backgroundColor: 0x444444,
    scene: PlayGame,
  };

  game = new Phaser.Game(gameConfig);

  window.focus();
  resize();
  window.addEventListener("resize", resize, false);
};

// responsive resize
function resize() {
  var canvas = document.querySelector("canvas");
  if (!canvas) return;

  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;
  var windowRatio = windowWidth / windowHeight;
  var gameRatio = game.config.width / game.config.height;

  if (windowRatio < gameRatio) {
    canvas.style.width = windowWidth + "px";
    canvas.style.height = windowWidth / gameRatio + "px";
  } else {
    canvas.style.width = windowHeight * gameRatio + "px";
    canvas.style.height = windowHeight + "px";
  }
}
