/**
 * MenuScene.js  —  YouTube Playables edition
 *
 * Key change: YT.gameReady() is called at the END of create(), once the menu
 * is fully drawn and interactive. This is the correct moment per YouTube spec.
 *
 * FIX: Previously gameReady() was called synchronously at the end of create().
 * This is correct in principle, but we now also ensure it fires on the NEXT
 * frame via this.time.delayedCall(0, ...) so that Phaser has fully committed
 * all graphics to the canvas before YouTube removes its loading overlay.
 * Calling gameReady before the first rendered frame is painted = blank screen
 * flash which can fail the "loading screen" certification check.
 */

import Phaser from "phaser";
import SaveManager from "../managers/SaveManager.js";
import SoundManager from "../managers/SoundManager.js";
import YT from "../managers/YouTubeSDK.js";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    SoundManager.init();

    // ─────────────────────────────────────────────
    // BACKGROUND
    // ─────────────────────────────────────────────
    this.cameras.main.setBackgroundColor("#0d0600");
    this._drawBackground(W, H);

    // ─────────────────────────────────────────────
    // SCALE FACTOR
    // ─────────────────────────────────────────────
    const isPortrait = H > W;
    const baseSide   = isPortrait ? W : Math.min(W, H);
    const ui         = Phaser.Math.Clamp(baseSide / 680, 0.50, 1.15);

    const rabbitScale0 = Phaser.Math.Clamp(ui * 0.95, 0.45, 0.90);
    const rabbitH0     = 230 * rabbitScale0;

    const titleSize0   = Phaser.Math.Clamp(40 * ui, 20, 48);
    const subSize0     = Phaser.Math.Clamp(20 * ui, 12, 28);
    const tagSize0     = Phaser.Math.Clamp(11 * ui,  8, 14);
    const panelH0      = Phaser.Math.Clamp(86 * ui, 64, 100);
    const btnH0        = Phaser.Math.Clamp(56 * ui, 44, 68);
    const btnGap0      = Phaser.Math.Clamp(14 * ui, 10, 22);

    const GAP_RABBIT_TITLE  = 10;
    const GAP_TITLE_SUB     = 6;
    const GAP_SUB_TAG       = 6;
    const GAP_TAG_PANEL     = 16;
    const GAP_PANEL_PLAY    = 20;
    const FOOTER_RESERVE    = 28;
    const PADDING_V         = isPortrait ? 14 : 20;

    const rawTotal =
      rabbitH0 + GAP_RABBIT_TITLE +
      titleSize0 + GAP_TITLE_SUB +
      subSize0 + GAP_SUB_TAG +
      tagSize0 + GAP_TAG_PANEL +
      panelH0 + GAP_PANEL_PLAY +
      btnH0 + btnGap0 +
      Math.round(btnH0 * 0.88) +
      FOOTER_RESERVE + PADDING_V * 2;

    const available = H - FOOTER_RESERVE;
    const fit       = rawTotal > available
      ? Phaser.Math.Clamp(available / rawTotal, 0.68, 1)
      : 1;

    const rabbitScale = rabbitScale0 * fit;
    const rabbitH     = rabbitH0 * fit;
    const titleSize   = Math.round(titleSize0 * fit);
    const subSize     = Math.round(subSize0 * fit);
    const tagSize     = Math.round(tagSize0 * fit);
    const panelH      = Math.round(panelH0 * fit);
    const btnH        = Math.round(btnH0 * fit);
    const btnGap      = Math.round(btnGap0 * fit);
    const uiFit       = ui * fit;

    const totalH =
      rabbitH + GAP_RABBIT_TITLE * fit +
      titleSize + GAP_TITLE_SUB * fit +
      subSize + GAP_SUB_TAG * fit +
      tagSize + GAP_TAG_PANEL * fit +
      panelH + GAP_PANEL_PLAY * fit +
      btnH + btnGap +
      Math.round(btnH * 0.88);

    const minTop = Math.max(PADDING_V, (H - FOOTER_RESERVE - totalH) / 2);
    let y = minTop;

    // ─── RABBIT ───────────────────────────────────
    this._drawRabbit(W / 2, y + rabbitH * 0.48, rabbitScale);
    y += rabbitH + GAP_RABBIT_TITLE * fit;

    // ─── TITLE ────────────────────────────────────
    this.add.text(W / 2, y, "RABBIT", {
      fontSize: `${titleSize}px`,
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: "900",
      color: "#fff5e0",
      stroke: "#1a0800",
      strokeThickness: Math.max(3, Math.ceil(8 * uiFit)),
    }).setOrigin(0.5, 0).setDepth(20);

    y += titleSize + GAP_TITLE_SUB * fit;

    this.add.text(W / 2, y, "PATH PAINTER", {
      fontSize: `${subSize}px`,
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: "bold",
      color: "#ffbe5e",
      stroke: "#1a0800",
      strokeThickness: Math.max(2, Math.ceil(5 * uiFit)),
    }).setOrigin(0.5, 0).setDepth(20);

    y += subSize + GAP_SUB_TAG * fit;

    this.add.text(
      W / 2, y,
      "Draw magical paths  •  Collect acorns  •  Reach home",
      {
        fontSize: `${tagSize}px`,
        fontFamily: "Arial, sans-serif",
        color: "#c8a070",
      }
    ).setOrigin(0.5, 0).setDepth(20);

    y += tagSize + GAP_TAG_PANEL * fit;

    // ─── ACORNS PANEL ─────────────────────────────
    const total  = SaveManager.getTotalStars();
    const panelW = Phaser.Math.Clamp(W * 0.82, 210, 380);

    this._drawPanel(W / 2, y + panelH / 2, panelW, panelH, uiFit);

    const labelSize = Math.max(9, Math.round(13 * uiFit));
    this.add.text(W / 2, y + panelH * 0.24, "⭐  ACORNS COLLECTED", {
      fontSize: `${labelSize}px`,
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: "bold",
      color: "#ffe5b4",
    }).setOrigin(0.5).setDepth(22);

    const countSize = Math.max(18, Math.round(32 * uiFit));
    this.add.text(W / 2, y + panelH * 0.70, `${total}  /  60`, {
      fontSize: `${countSize}px`,
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: "900",
      color: "#ffd06a",
      stroke: "#1a0800",
      strokeThickness: Math.max(2, Math.ceil(5 * uiFit)),
    }).setOrigin(0.5).setDepth(22);

    y += panelH + GAP_PANEL_PLAY * fit;

    // ─── PLAY BUTTON ──────────────────────────────
    this._premiumButton(
      W / 2, y + btnH / 2,
      "▶  PLAY",
      { base: 0xc46010, top: 0xf09030, border: 0xffd898 },
      btnH, W, uiFit, true,
      () => { this.scene.start("LevelSelectScene"); }
    );

    y += btnH + btnGap;

    // ─── RESET BUTTON ─────────────────────────────
    const resetH = Math.round(btnH * 0.88);
    this._premiumButton(
      W / 2, y + resetH / 2,
      "↺  RESET PROGRESS",
      { base: 0x5a1c14, top: 0x8a3224, border: 0xcc6655 },
      resetH, W, uiFit, false,
      async () => {
        await SaveManager.reset();
        this.scene.restart();
      }
    );

    // ─── FOOTER ───────────────────────────────────
    this.add.text(W / 2, H - 12, "A cozy puzzle adventure", {
      fontSize: `${Math.max(9, Math.round(11 * uiFit))}px`,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      fontStyle: "600",
      color: "#aa8665",
      stroke: "#361e0b",
      strokeThickness: 3,
      shadow: {
        offsetX: 0, offsetY: 1.5,
        color: "rgba(20, 10, 0, 0.6)",
        blur: 2, stroke: true, fill: true,
      },
    }).setOrigin(0.5).setDepth(50);

    // ✅ gameReady — deferred by one frame so Phaser has fully painted the
    // canvas before YouTube removes its loading overlay. This prevents a
    // blank-canvas flash between the loading spinner disappearing and the
    // menu being visible, which can fail the "loading screen" cert check.
    this.time.delayedCall(0, () => {
      YT.gameReady();
    });
  }

  // ═══════════════════════════════════════════════
  // BACKGROUND
  // ═══════════════════════════════════════════════
 // ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// ULTRA CLEAN BACKGROUND
// ═══════════════════════════════════════════════
_drawBackground(W, H) {
  // CLEAN DARK BACKGROUND
  const bg = this.add.graphics();

  bg.fillGradientStyle(
    0x140900,
    0x140900,
    0x070300,
    0x070300,
    1
  );

  bg.fillRect(0, 0, W, H);

  // SMALL STARS
  for (let i = 0; i < 45; i++) {
    const star = this.add.circle(
      Math.random() * W,
      Math.random() * H * 0.7,
      Phaser.Math.FloatBetween(0.6, 1.5),
      0xfff6e8,
      Phaser.Math.FloatBetween(0.18, 0.45)
    );

    star.setDepth(2);

    this.tweens.add({
      targets: star,
      alpha: Phaser.Math.FloatBetween(0.05, 0.12),
      duration: Phaser.Math.Between(2500, 5500),
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 3000
    });
  }

  // FLOATING PREMIUM PARTICLES
  for (let i = 0; i < 18; i++) {
    const p = this.add.circle(
      Math.random() * W,
      Math.random() * H,
      Phaser.Math.FloatBetween(1.5, 3),
      Phaser.Math.RND.pick([
        0xffd76a,
        0xffefb0,
        0xffc84d
      ]),
      Phaser.Math.FloatBetween(0.12, 0.32)
    );

    p.setDepth(5);

    this.tweens.add({
      targets: p,
      y: p.y - Phaser.Math.Between(20, 45),
      x: p.x + Phaser.Math.Between(-10, 10),
      alpha: 0.02,
      duration: Phaser.Math.Between(3500, 6500),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 3000
    });
  }
}
  // PANEL
  // ═══════════════════════════════════════════════
 // ═══════════════════════════════════════════════
// CLEAN PANEL
// ═══════════════════════════════════════════════
_drawPanel(cx, cy, pw, ph, ui) {
  const panel = this.add.graphics();

  panel.setDepth(11);

  // MAIN PANEL
  panel.fillGradientStyle(
    0x2a1403,
    0x2a1403,
    0x140800,
    0x140800,
    1
  );

  panel.fillRoundedRect(
    cx - pw / 2,
    cy - ph / 2,
    pw,
    ph,
    20
  );

  // TOP SHINE
  panel.fillGradientStyle(
    0xffffff,
    0xffffff,
    0xffffff,
    0xffffff,
    0.05,
    0.05,
    0,
    0
  );

  panel.fillRoundedRect(
    cx - pw / 2 + 3,
    cy - ph / 2 + 3,
    pw - 6,
    ph * 0.32,
    18
  );

  // BORDER
  panel.lineStyle(
    Math.ceil(1.5 * ui),
    0xd79a4a,
    0.65
  );

  panel.strokeRoundedRect(
    cx - pw / 2,
    cy - ph / 2,
    pw,
    ph,
    20
  );
}

  // ═══════════════════════════════════════════════
  // PREMIUM BUTTON
  // ═══════════════════════════════════════════════
  _premiumButton(cx, cy, label, colors, bh, sceneW, ui, big, callback) {
    const bw = Phaser.Math.Clamp(sceneW * 0.74, 220, 350);
    const radius = Math.round(bh * 0.42);
    const fontSize = big
      ? Phaser.Math.Clamp(22 * ui, 16, 28)
      : Phaser.Math.Clamp(17 * ui, 13, 22);

    const shadow = this.add.graphics();
    shadow.setDepth(15);
    shadow.fillStyle(0x000000, 0.45);
    shadow.fillRoundedRect(cx - bw / 2 + 3, cy - bh / 2 + 6, bw, bh, radius);

    const face = this.add.graphics();
    face.setDepth(16);

    const drawFace = (topColor, shade) => {
      face.clear();
      face.fillStyle(shade, 1);
      face.fillRoundedRect(cx - bw / 2, cy - bh / 2 + 4, bw, bh, radius);
      const dark = Phaser.Display.Color.ValueToColor(topColor).darken(28).color;
      face.fillGradientStyle(topColor, topColor, dark, dark, 1);
      face.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh - 4, radius);
      face.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.12, 0.12, 0, 0);
      face.fillRoundedRect(cx - bw / 2 + 6, cy - bh / 2 + 4, bw - 12, (bh - 4) * 0.38, radius - 2);
      face.lineStyle(Math.ceil(1.8 * ui), colors.border, 0.8);
      face.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, radius);
    };

    const bevelColor = Phaser.Display.Color.ValueToColor(colors.base).darken(45).color;
    drawFace(colors.top, bevelColor);

    const txt = this.add.text(cx, cy - 1, label, {
      fontSize: `${fontSize}px`,
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: "900",
      color: "#fff8ec",
      stroke: "#1a0800",
      strokeThickness: Math.ceil(big ? 5 * ui : 4 * ui),
    }).setOrigin(0.5).setDepth(20);

    const zone = this.add.zone(cx, cy, bw, bh).setInteractive();

    zone.on("pointerover", () => {
      const hoverTop = Phaser.Display.Color.ValueToColor(colors.top).lighten(16).color;
      drawFace(hoverTop, bevelColor);
      glow.setAlpha(0.30);
      txt.setScale(1.04);
      SoundManager.play("hover");
    });

    zone.on("pointerout", () => {
      drawFace(colors.top, bevelColor);
      glow.setAlpha(0.18);
      txt.setScale(1);
    });

    zone.on("pointerdown", () => {
      face.clear();
      const dark = Phaser.Display.Color.ValueToColor(colors.base).darken(28).color;
      face.fillGradientStyle(dark, dark, colors.base, colors.base, 1);
      face.fillRoundedRect(cx - bw / 2, cy - bh / 2 + 4, bw, bh - 4, radius);
      face.lineStyle(Math.ceil(1.8 * ui), colors.border, 0.6);
      face.strokeRoundedRect(cx - bw / 2, cy - bh / 2 + 4, bw, bh - 4, radius);
      txt.setY(cy + 3);
      txt.setScale(0.97);
      SoundManager.play("click");
      this.time.delayedCall(120, () => {
        drawFace(colors.top, bevelColor);
        txt.setY(cy - 1);
        txt.setScale(1);
        callback();
      });
    });
  }

  // ═══════════════════════════════════════════════
  // RABBIT
  // ═══════════════════════════════════════════════
  _drawRabbit(x, y, scale = 1) {
    const g = this.add.graphics();
    g.setDepth(15);

    // g.fillStyle(0x000000, 0.16);
    // g.fillEllipse(x, y + 108 * scale, 112 * scale, 22 * scale);

    // const glow = this.add.circle(x, y + 12 * scale, 105 * scale, 0xffaa40, 0.11);
    // glow.setDepth(10);

    g.fillStyle(0xf6fcff, 1);
    g.fillEllipse(x - 34 * scale, y - 70 * scale, 40 * scale, 114 * scale);
    g.fillEllipse(x + 34 * scale, y - 70 * scale, 40 * scale, 114 * scale);

    g.fillStyle(0xffb5c4, 1);
    g.fillEllipse(x - 34 * scale, y - 70 * scale, 15 * scale, 68 * scale);
    g.fillEllipse(x + 34 * scale, y - 70 * scale, 15 * scale, 68 * scale);

    g.fillStyle(0xf6fcff, 1);
    g.fillEllipse(x, y, 152 * scale, 158 * scale);

    g.fillStyle(0xffc2cb, 1);
    g.fillEllipse(x, y + 40 * scale, 52 * scale, 56 * scale);

    g.fillStyle(0xf6fcff, 1);
    g.fillEllipse(x - 66 * scale, y + 10 * scale, 28 * scale, 66 * scale);
    g.fillEllipse(x + 66 * scale, y + 10 * scale, 28 * scale, 66 * scale);

    g.fillEllipse(x - 38 * scale, y + 90 * scale, 44 * scale, 24 * scale);
    g.fillEllipse(x + 38 * scale, y + 90 * scale, 44 * scale, 24 * scale);

    g.fillStyle(0x233040, 1);
    g.fillCircle(x - 22 * scale, y - 4 * scale, 6 * scale);
    g.fillCircle(x + 22 * scale, y - 4 * scale, 6 * scale);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(x - 20 * scale, y - 7 * scale, 2 * scale);
    g.fillCircle(x + 24 * scale, y - 7 * scale, 2 * scale);

    g.fillStyle(0xff9db0, 0.65);
    g.fillCircle(x - 40 * scale, y + 13 * scale, 10 * scale);
    g.fillCircle(x + 40 * scale, y + 13 * scale, 10 * scale);

    g.fillStyle(0xff7088, 1);
    g.fillTriangle(
      x, y + 2 * scale,
      x - 6 * scale, y - 5 * scale,
      x + 6 * scale, y - 5 * scale
    );

    g.lineStyle(3 * scale, 0x334455, 1);
    g.beginPath();
    g.arc(x, y + 14 * scale, 13 * scale, 0, Math.PI);
    g.strokePath();

    g.fillStyle(0x8a4b13, 1);
    g.fillEllipse(x + 72 * scale, y + 64 * scale, 28 * scale, 40 * scale);
    g.fillStyle(0xd89a38, 1);
    g.fillEllipse(x + 72 * scale, y + 50 * scale, 28 * scale, 13 * scale);

    this.tweens.add({
       targets: g,
      y: "+=7",
      duration: 1900,
      yoyo: true, repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}