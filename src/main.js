/**
 * main.js  —  YouTube Playables edition
 *
 * Renderer: smart WebGL detection with Canvas fallback.
 *   The YouTube test suite runs in a sandboxed iframe where WebGL framebuffers
 *   fail ("Framebuffer status: Incomplete Attachment"), crashing Phaser before
 *   any scene starts. The real YouTube Playables platform supports WebGL fine.
 *
 *   Solution: probe WebGL before passing it to Phaser. If the probe fails
 *   (test suite / restricted sandbox), fall back to Canvas. On real devices
 *   WebGL is used and the UI looks its best.
 *
 * Scale: no explicit width/height.
 *   YouTube WebView starts at 0x0. RESIZE mode without fixed dimensions lets
 *   Phaser pick up the real size once the WebView expands.
 */

import Phaser from "phaser";
import BootScene        from "./scenes/BootScene.js";
import PreloadScene     from "./scenes/PreloadScene.js";
import MenuScene        from "./scenes/MenuScene.js";
import LevelSelectScene from "./scenes/LevelSelectScene.js";
import GameScene        from "./scenes/GameScene.js";
import WinScene         from "./scenes/WinScene.js";

/**
 * Probe whether WebGL is actually usable in this environment.
 * Returns Phaser.AUTO (WebGL) if it works, Phaser.CANVAS if not.
 */
function getRenderer() {
  try {
    const testCanvas = document.createElement("canvas");
    const gl =
      testCanvas.getContext("webgl") ||
      testCanvas.getContext("experimental-webgl");
    if (!gl) return Phaser.CANVAS;

    // Attempt a framebuffer — this is the exact operation that throws
    // inside the YouTube test suite sandbox
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);

    // Any status other than FRAMEBUFFER_COMPLETE means WebGL is broken here
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      return Phaser.CANVAS;
    }
    return Phaser.AUTO;
  } catch (e) {
    return Phaser.CANVAS;
  }
}

const config = {
  type: getRenderer(),
  parent: "game",
  backgroundColor: "#0d0600",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
  scene: [BootScene, PreloadScene, MenuScene, LevelSelectScene, GameScene, WinScene],
};

new Phaser.Game(config);