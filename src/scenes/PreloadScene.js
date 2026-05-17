import Phaser from "phaser";

export default class PreloadScene extends Phaser.Scene {
  constructor() { super("PreloadScene"); }

  preload() {
    const w = this.scale.width, h = this.scale.height;

    // Dark underground background
    this.add.rectangle(w/2, h/2, w, h, 0x120800);

    // Dirt texture blobs
    const bg = this.add.graphics();
    bg.fillStyle(0x1e0e02, 0.6);
    bg.fillEllipse(w*0.2, h*0.3, 200, 120);
    bg.fillEllipse(w*0.75, h*0.7, 180, 100);
    bg.fillStyle(0x2a1200, 0.4);
    bg.fillEllipse(w*0.5, h*0.5, 300, 200);

    // Root lines
    bg.lineStyle(1.5, 0x5a3010, 0.3);
    bg.beginPath();
    bg.moveTo(0, h*0.2);
    bg.lineTo(w*0.3, h*0.4);
    bg.lineTo(w*0.6, h*0.3);
    bg.lineTo(w, h*0.5);
    bg.strokePath();
    bg.beginPath();
    bg.moveTo(0, h*0.75);
    bg.lineTo(w*0.4, h*0.65);
    bg.lineTo(w*0.8, h*0.72);
    bg.lineTo(w, h*0.6);
    bg.strokePath();

    // Title — BURROW
    this.add.text(w/2, h*0.35, "BURROW", {
      fontSize:"52px", fontStyle:"bold", color:"#d4780a",
      stroke:"#3d1a00", strokeThickness:5
    }).setOrigin(0.5);
    this.add.text(w/2, h*0.5, "RUNNER", {
      fontSize:"52px", fontStyle:"bold", color:"#e8c87a",
      stroke:"#3d1a00", strokeThickness:5
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(w/2, h*0.62, "Digging through the underground...", {
      fontSize:"13px", color:"#9a6a30"
    }).setOrigin(0.5);

    // Loading bar (looks like a dirt tunnel filling up)
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a0a00, 1);
    barBg.fillRoundedRect(w/2 - 152, h*0.72 - 10, 304, 20, 10);
    barBg.lineStyle(2, 0x5a3010, 0.8);
    barBg.strokeRoundedRect(w/2 - 152, h*0.72 - 10, 304, 20, 10);

    const bar = this.add.rectangle(w/2 - 148, h*0.72, 4, 14, 0xd4780a).setOrigin(0, 0.5);

    this.load.on("progress", v => { bar.width = 4 + v * 296; });

    // Digging dots animation
    this._dots = this.add.text(w/2, h*0.82, "● ○ ○", {
      fontSize:"18px", color:"#6a4010"
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
      }
    });

    // White tile texture (keep for compatibility)
    if (!this.textures.exists("white_tile")) {
      const c = document.createElement("canvas");
      c.width = c.height = 2;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0,0,2,2);
      this.textures.addCanvas("white_tile", c);
    }
  }

  create() {
    this.scene.start("MenuScene");
  }
}