/**
 * PreloadScene.js  —  YouTube Playables edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows a loading screen while assets load, then starts MenuScene.
 *
 * FIX: YouTube WebView initialises with a 0×0 viewport and resizes once the
 * game is displayed. We listen for the Phaser resize event and refresh the
 * loading screen if the initial dimensions were zero. This prevents a blank
 * canvas being shown when gameReady is eventually called.
 *
 * YT.firstFrameReady() was already called in BootScene.
 * YT.gameReady() will be called from MenuScene once the menu is interactive.
 */

import Phaser from "phaser";

export default class PreloadScene extends Phaser.Scene {
  constructor() { super("PreloadScene"); }

  preload() {
    // Guard: if viewport is still 0×0, wait for the resize event before
    // drawing the loading screen. Phaser fires 'resize' when the WebView
    // expands to its real dimensions.
    this._initScreen();

    this.scale.on("resize", (gameSize) => {
      if (gameSize.width > 0 && gameSize.height > 0) {
        this._initScreen();
      }
    });

    // White tile texture (kept for scene compatibility)
    if (!this.textures.exists("white_tile")) {
      const c = document.createElement("canvas");
      c.width = c.height = 2;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 2, 2);
      this.textures.addCanvas("white_tile", c);
    }
  }

  _initScreen() {
    const w = this.scale.width;
    const h = this.scale.height;

    // If dimensions are still zero, nothing to draw yet
    if (w === 0 || h === 0) return;

    // Clear previous drawings if we re-init after resize
    if (this._screenBuilt) {
      this.children.removeAll(true);
    }
    this._screenBuilt = true;

    // Dark underground background
    this.add.rectangle(w / 2, h / 2, w, h, 0x120800);

    // Dirt texture blobs
    const bg = this.add.graphics();
    bg.fillStyle(0x1e0e02, 0.6);
    bg.fillEllipse(w * 0.2, h * 0.3, 200, 120);
    bg.fillEllipse(w * 0.75, h * 0.7, 180, 100);
    bg.fillStyle(0x2a1200, 0.4);
    bg.fillEllipse(w * 0.5, h * 0.5, 300, 200);

    // Root lines
    bg.lineStyle(1.5, 0x5a3010, 0.3);
    bg.beginPath();
    bg.moveTo(0, h * 0.2);
    bg.lineTo(w * 0.3, h * 0.4);
    bg.lineTo(w * 0.6, h * 0.3);
    bg.lineTo(w, h * 0.5);
    bg.strokePath();
    bg.beginPath();
    bg.moveTo(0, h * 0.75);
    bg.lineTo(w * 0.4, h * 0.65);
    bg.lineTo(w * 0.8, h * 0.72);
    bg.lineTo(w, h * 0.6);
    bg.strokePath();

    // Title
    this.add.text(w / 2, h * 0.35, "BURROW", {
      fontSize: "52px", fontStyle: "bold", color: "#d4780a",
      stroke: "#3d1a00", strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(w / 2, h * 0.5, "RUNNER", {
      fontSize: "52px", fontStyle: "bold", color: "#e8c87a",
      stroke: "#3d1a00", strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.62, "Digging through the underground...", {
      fontSize: "13px", color: "#9a6a30",
    }).setOrigin(0.5);

    // Loading bar
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a0a00, 1);
    barBg.fillRoundedRect(w / 2 - 152, h * 0.72 - 10, 304, 20, 10);
    barBg.lineStyle(2, 0x5a3010, 0.8);
    barBg.strokeRoundedRect(w / 2 - 152, h * 0.72 - 10, 304, 20, 10);

    const bar = this.add.rectangle(w / 2 - 148, h * 0.72, 4, 14, 0xd4780a).setOrigin(0, 0.5);

    this.load.on("progress", (v) => { bar.width = 4 + v * 296; });

    // Animated dots
    if (this._dots) { this._dots = null; }
    this._dots = this.add.text(w / 2, h * 0.82, "● ○ ○", {
      fontSize: "18px", color: "#6a4010",
    }).setOrigin(0.5);

    let frame = 0;
    this.time.addEvent({
      delay: 300, repeat: -1,
      callback: () => {
        const patterns = ["● ○ ○", "○ ● ○", "○ ○ ●", "○ ● ○"];
        if (this._dots && this._dots.active) {
          this._dots.setText(patterns[frame % patterns.length]);
        }
        frame++;
      },
    });
  }

  create() {
    this.scene.start("MenuScene");
  }
}