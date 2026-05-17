import Phaser from "phaser";
import BootScene       from "./scenes/BootScene.js";
import PreloadScene    from "./scenes/PreloadScene.js";
import MenuScene       from "./scenes/MenuScene.js";
import LevelSelectScene from "./scenes/LevelSelectScene.js";
import GameScene       from "./scenes/GameScene.js";
import WinScene        from "./scenes/WinScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#1a0a2e",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
  scene: [BootScene, PreloadScene, MenuScene, LevelSelectScene, GameScene, WinScene],
};

new Phaser.Game(config);
