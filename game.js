// === SETTINGS FROM localStorage ===
const difficulty = localStorage.getItem("difficulty") || "medium";
let bgSoundEnabled = localStorage.getItem("bgSound") === "true";
let gameSoundEnabled = localStorage.getItem("gameSound") === "true";

let bgMusic; // background music reference
let hitSound, collisionSound;

// the game itself
var game;

// global game options
var gameOptions = {
  rotationSpeed:
    difficulty === "easy" ? 2 :
    difficulty === "hard" ? 5 : 3, // easy=slow, medium=normal, hard=fast
  throwSpeed: 150,
  totalKnives: 5
};


function PlayGame() {
  let canThrow = true;
  let knife;
  let target;
  let knifeGroup;
  let appleGroup;
  let remainingKnives;
  let knivesText;

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
      if (confirm("💥 Game Over! All knives fell! Restart?")) {
        // ensure bg music stops before restart
        if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
            // reload to main menu or just reload page
        window.location.reload();
      } else {
        if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
        // reload to main menu or just reload page
        window.location.reload();
      }
    });
  };

  // preload images + audio
  this.preload = function () {
    this.load.image("target", "../assets/images/target.png");
    this.load.image("knife", "../assets/images/knife.png");
    this.load.image("apple", "../assets/images/apple.png"); // preload apple
    this.load.audio("bgMusic", "../assets/audio/bg.mp3");
    this.load.audio("hit", "../assets/audio/hit.mp3");
    this.load.audio("collision", "../assets/audio/collision.mp3");
  };

  // create objects
  this.create = function () {
    // re-read settings each time scene created
    bgSoundEnabled = localStorage.getItem("bgSound") === "true";
    gameSoundEnabled = localStorage.getItem("gameSound") === "true";

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

    // show remaining knives text
    knivesText = this.add.text(
      game.config.width / 2,
      80,
      `Knives Left: ${remainingKnives}`,
      {
        fontSize: "48px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "center",
      }
    ).setOrigin(0.5);

    // randomly add 1-4 apples
    let numApples = Phaser.Math.Between(1, 5);
    for (let i = 0; i < numApples; i++) {
      const newApple = this.add.sprite(0, 0, "apple");
      newApple.setScale(0.10); // adjust as needed

      const angle = Phaser.Math.Between(0, 360);
      newApple.angle = angle;
      const radians = Phaser.Math.DegToRad(angle + 90);

      // Adjusted radius so apple sits fully outside target surface
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
                this.tweens.add({
                  targets: apple,
                  y: game.config.height + 200,
                  angle: Phaser.Math.Between(-180, 180),
                  duration: 600,
                  ease: "Cubic.easeIn",
                  onComplete: () => apple.destroy()
                });
              }
            });

            // decrease knife count
            remainingKnives--;
            knivesText.setText(`Knives Left: ${remainingKnives}`);

            // check win condition
            if (remainingKnives === 0) {
              canThrow = false; // prevent further throws
              this.time.delayedCall(200, () => {
                if (confirm("🎉 You Win! Start a new game?")) {
                  if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
               window.location.reload();
                } else {
                  if (bgMusic && bgMusic.isPlaying) bgMusic.stop();
                  window.location.reload();
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
