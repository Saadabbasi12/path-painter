import Phaser from "phaser";
import SaveManager from "../managers/SaveManager.js";
import SoundManager from "../managers/SoundManager.js";

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
    // Base ui off the narrower side (width on portrait).
    // Then compute all element sizes, measure the total
    // stack height, and shrink everything uniformly with
    // a "fit" multiplier so it ALWAYS fits inside H.
    // ─────────────────────────────────────────────
    const isPortrait = H > W;
    const baseSide   = isPortrait ? W : Math.min(W, H);
    const ui         = Phaser.Math.Clamp(baseSide / 680, 0.50, 1.15);

    // ── Raw element sizes at ui scale ──
    const rabbitScale0 = Phaser.Math.Clamp(ui * 0.95, 0.45, 0.90);
    const rabbitH0     = 230 * rabbitScale0;

    const titleSize0   = Phaser.Math.Clamp(40 * ui, 20, 48);
    const subSize0     = Phaser.Math.Clamp(20 * ui, 12, 28);
    const tagSize0     = Phaser.Math.Clamp(11 * ui,  8, 14);
    const panelH0      = Phaser.Math.Clamp(86 * ui, 64, 100);
    const btnH0        = Phaser.Math.Clamp(56 * ui, 44, 68);
    const btnGap0      = Phaser.Math.Clamp(14 * ui, 10, 22);

    // Fixed gaps between sections
    const GAP_RABBIT_TITLE  = 10;
    const GAP_TITLE_SUB     = 6;
    const GAP_SUB_TAG       = 6;
    const GAP_TAG_PANEL     = 16;
    const GAP_PANEL_PLAY    = 20;
    const FOOTER_RESERVE    = 28;
    const PADDING_V         = isPortrait ? 14 : 20; // top + bottom padding

    const rawTotal =
      rabbitH0 + GAP_RABBIT_TITLE +
      titleSize0 + GAP_TITLE_SUB +
      subSize0 + GAP_SUB_TAG +
      tagSize0 + GAP_TAG_PANEL +
      panelH0 + GAP_PANEL_PLAY +
      btnH0 + btnGap0 +
      Math.round(btnH0 * 0.88) +
      FOOTER_RESERVE + PADDING_V * 2;

    // Fit multiplier — shrink proportionally if content is taller than screen
    const available = H - FOOTER_RESERVE;
    const fit       = rawTotal > available
      ? Phaser.Math.Clamp(available / rawTotal, 0.68, 1)
      : 1;

    // ── Final sizes after fit correction ──
    const rabbitScale = rabbitScale0 * fit;
    const rabbitH     = rabbitH0 * fit;
    const titleSize   = Math.round(titleSize0 * fit);
    const subSize     = Math.round(subSize0 * fit);
    const tagSize     = Math.round(tagSize0 * fit);
    const panelH      = Math.round(panelH0 * fit);
    const btnH        = Math.round(btnH0 * fit);
    const btnGap      = Math.round(btnGap0 * fit);
    const uiFit       = ui * fit;   // for stroke/border thicknesses

    const totalH =
      rabbitH + GAP_RABBIT_TITLE * fit +
      titleSize + GAP_TITLE_SUB * fit +
      subSize + GAP_SUB_TAG * fit +
      tagSize + GAP_TAG_PANEL * fit +
      panelH + GAP_PANEL_PLAY * fit +
      btnH + btnGap +
      Math.round(btnH * 0.88);

    // Centre the stack vertically with a minimum top padding
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
      () => { SaveManager.reset(); this.scene.restart(); }
    );

    // ─── FOOTER ───────────────────────────────────
   this.add.text(W / 2, H - 12, "A cozy puzzle adventure", {
  fontSize: `${Math.max(9, Math.round(11 * uiFit))}px`,
  // A modern, softer system font stack looks way cleaner than Arial
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontStyle: "600", 
  color: "#aa8665", // Soft warm cream instead of blinding white
  stroke: "#361e0b", // Deep earthy brown outline so it reads perfectly over backgrounds
  strokeThickness: 3,
  shadow: {
    offsetX: 0,
    offsetY: 1.5,
    color: "rgba(20, 10, 0, 0.6)",
    blur: 2,
    stroke: true,
    fill: true
  }
}).setOrigin(0.5).setDepth(50);
  }

  // ═══════════════════════════════════════════════
  // BACKGROUND  — deep forest, NO top sky glow
  // ═══════════════════════════════════════════════
  _drawBackground(W, H) {
    // Solid dark gradient base
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1e0d00, 0x1e0d00, 0x050200, 0x050200, 1);
    bg.fillRect(0, 0, W, H);

    // Single centred warm fill in lower half only (no sky glow at top)
    const warmFill = this.add.ellipse(
      W / 2, H * 0.72,
      W * 0.9, H * 0.55,
      0xff8c30, 0.07
    );
    warmFill.setDepth(1);

    // Layered rolling hills
    const hillColors = [0x100600, 0x180b00, 0x200f00, 0x281400, 0x301a00];
    for (let i = 0; i < 5; i++) {
      const hill = this.add.graphics();
      hill.setDepth(3 + i);
      hill.fillStyle(hillColors[i], 1);
      const baseY = H * (0.68 + i * 0.065);
      hill.beginPath();
      hill.moveTo(0, H);
      for (let x = 0; x <= W + 120; x += 60) {
        const yy = baseY
          + Math.sin(x * 0.012 + i * 1.3) * 22
          + Math.cos(x * 0.023 + i * 0.7) * 14;
        hill.lineTo(x, yy);
      }
      hill.lineTo(W, H);
      hill.closePath();
      hill.fillPath();
    }

    // Tree silhouettes (behind hills layer)
    for (let i = 0; i < 45; i++) {
      const tree = this.add.graphics();
      const tx = Phaser.Math.Between(0, W);
      const ty = Phaser.Math.Between(H * 0.58, H * 0.88);
      const s  = Phaser.Math.FloatBetween(0.4, 1.1);
      tree.fillStyle(0x0a0500, 1);
      tree.fillRect(tx, ty, 5 * s, 32 * s);
      tree.fillTriangle(
        tx - 18 * s, ty + 4 * s,
        tx + 2.5 * s, ty - 36 * s,
        tx + 23 * s, ty + 4 * s
      );
      tree.fillTriangle(
        tx - 14 * s, ty - 10 * s,
        tx + 2.5 * s, ty - 52 * s,
        tx + 19 * s, ty - 10 * s
      );
      tree.setDepth(11);
    }

    // Stars (upper portion of sky only — subtle)
    for (let i = 0; i < 55; i++) {
      const star = this.add.circle(
        Math.random() * W,
        Math.random() * H * 0.58,
        Phaser.Math.FloatBetween(0.6, 1.8),
        0xfff8e8,
        Phaser.Math.FloatBetween(0.15, 0.55)
      );
      star.setDepth(2);
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.02, 0.12),
        duration: Phaser.Math.Between(2500, 6000),
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 4000,
      });
    }

    // Fireflies — lower half
    for (let i = 0; i < 28; i++) {
      const ff = this.add.circle(
        Math.random() * W,
        H * 0.45 + Math.random() * H * 0.55,
        Phaser.Math.FloatBetween(1.5, 3.5),
        Phaser.Math.RND.pick([0xffe060, 0xfff3a0, 0xffc840]),
        Phaser.Math.FloatBetween(0.2, 0.65)
      );
      ff.setDepth(19);
      this.tweens.add({
        targets: ff,
        y: ff.y - Phaser.Math.Between(18, 55),
        x: ff.x + Phaser.Math.Between(-22, 22),
        alpha: 0.03,
        duration: Phaser.Math.Between(2800, 6500),
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 4000,
      });
    }

    // Dust motes
    for (let i = 0; i < 40; i++) {
      const d = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        Phaser.Math.FloatBetween(0.5, 1.8),
        0xffffff,
        Phaser.Math.FloatBetween(0.04, 0.12)
      );
      d.setDepth(18);
      this.tweens.add({
        targets: d,
        y: d.y - 28,
        alpha: 0,
        duration: 3500 + Math.random() * 3000,
        repeat: -1,
        delay: Math.random() * 5000,
      });
    }
  }

  // ═══════════════════════════════════════════════
  // PANEL  (acorns collected card)
  // ═══════════════════════════════════════════════
  _drawPanel(cx, cy, pw, ph, ui) {
    // Soft outer glow
    const glow = this.add.ellipse(cx, cy, pw * 1.05, ph * 1.6, 0xff9930, 0.07);
    glow.setDepth(9);

    // Drop shadow
    const shadow = this.add.graphics();
    shadow.setDepth(10);
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(cx - pw / 2 + 4, cy - ph / 2 + 6, pw, ph, 20);

    // Panel body
    const panel = this.add.graphics();
    panel.setDepth(11);
    panel.fillGradientStyle(0x3e1e04, 0x3e1e04, 0x1c0c00, 0x1c0c00, 1);
    panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 20);

    // Subtle inner highlight stripe at top
    panel.fillGradientStyle(0xffd080, 0xffd080, 0xffd080, 0xffd080, 0.06, 0.06, 0, 0);
    panel.fillRoundedRect(cx - pw / 2 + 2, cy - ph / 2 + 2, pw - 4, ph / 3, 18);

    // Border
    panel.lineStyle(Math.ceil(1.5 * ui), 0xd4883a, 0.75);
    panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 20);
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

    // Outer ambient glow
    const glow = this.add.ellipse(cx, cy, bw * 0.88, bh * 2.0, colors.base, 0.18);
    glow.setDepth(14);

    // Drop shadow
    const shadow = this.add.graphics();
    shadow.setDepth(15);
    shadow.fillStyle(0x000000, 0.45);
    shadow.fillRoundedRect(cx - bw / 2 + 3, cy - bh / 2 + 6, bw, bh, radius);

    // Button face (redrawn on hover)
    const face = this.add.graphics();
    face.setDepth(16);

    const drawFace = (topColor, shade) => {
      face.clear();

      // Bottom bevel  (gives 3-D press depth)
      face.fillStyle(shade, 1);
      face.fillRoundedRect(cx - bw / 2, cy - bh / 2 + 4, bw, bh, radius);

      // Main gradient face
      const dark = Phaser.Display.Color.ValueToColor(topColor).darken(28).color;
      face.fillGradientStyle(topColor, topColor, dark, dark, 1);
      face.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh - 4, radius);

      // Top inner highlight
      face.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.12, 0.12, 0, 0);
      face.fillRoundedRect(cx - bw / 2 + 6, cy - bh / 2 + 4, bw - 12, (bh - 4) * 0.38, radius - 2);

      // Border
      face.lineStyle(Math.ceil(1.8 * ui), colors.border, 0.8);
      face.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, radius);
    };

    const bevelColor = Phaser.Display.Color.ValueToColor(colors.base).darken(45).color;
    drawFace(colors.top, bevelColor);

    // Label text
    const txt = this.add.text(cx, cy - 1, label, {
      fontSize: `${fontSize}px`,
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: "900",
      color: "#fff8ec",
      stroke: "#1a0800",
      strokeThickness: Math.ceil(big ? 5 * ui : 4 * ui),
    }).setOrigin(0.5).setDepth(20);

    // Hit zone
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
      // Press — shift face down to simulate click
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

    // Ground shadow
    g.fillStyle(0x000000, 0.16);
    g.fillEllipse(x, y + 108 * scale, 112 * scale, 22 * scale);

    // Soft glow behind rabbit
    const glow = this.add.circle(x, y + 12 * scale, 105 * scale, 0xffaa40, 0.11);
    glow.setDepth(10);

    // Ears
    g.fillStyle(0xf6fcff, 1);
    g.fillEllipse(x - 34 * scale, y - 70 * scale, 40 * scale, 114 * scale);
    g.fillEllipse(x + 34 * scale, y - 70 * scale, 40 * scale, 114 * scale);

    // Inner ears
    g.fillStyle(0xffb5c4, 1);
    g.fillEllipse(x - 34 * scale, y - 70 * scale, 15 * scale, 68 * scale);
    g.fillEllipse(x + 34 * scale, y - 70 * scale, 15 * scale, 68 * scale);

    // Body
    g.fillStyle(0xf6fcff, 1);
    g.fillEllipse(x, y, 152 * scale, 158 * scale);

    // Belly
    g.fillStyle(0xffc2cb, 1);
    g.fillEllipse(x, y + 40 * scale, 52 * scale, 56 * scale);

    // Arms
    g.fillStyle(0xf6fcff, 1);
    g.fillEllipse(x - 66 * scale, y + 10 * scale, 28 * scale, 66 * scale);
    g.fillEllipse(x + 66 * scale, y + 10 * scale, 28 * scale, 66 * scale);

    // Feet
    g.fillEllipse(x - 38 * scale, y + 90 * scale, 44 * scale, 24 * scale);
    g.fillEllipse(x + 38 * scale, y + 90 * scale, 44 * scale, 24 * scale);

    // Eyes
    g.fillStyle(0x233040, 1);
    g.fillCircle(x - 22 * scale, y - 4 * scale, 6 * scale);
    g.fillCircle(x + 22 * scale, y - 4 * scale, 6 * scale);

    // Eye shine
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x - 20 * scale, y - 7 * scale, 2 * scale);
    g.fillCircle(x + 24 * scale, y - 7 * scale, 2 * scale);

    // Blush
    g.fillStyle(0xff9db0, 0.65);
    g.fillCircle(x - 40 * scale, y + 13 * scale, 10 * scale);
    g.fillCircle(x + 40 * scale, y + 13 * scale, 10 * scale);

    // Nose
    g.fillStyle(0xff7088, 1);
    g.fillTriangle(
      x, y + 2 * scale,
      x - 6 * scale, y - 5 * scale,
      x + 6 * scale, y - 5 * scale
    );

    // Smile
    g.lineStyle(3 * scale, 0x334455, 1);
    g.beginPath();
    g.arc(x, y + 14 * scale, 13 * scale, 0, Math.PI);
    g.strokePath();

    // Acorn (held in right arm)
    g.fillStyle(0x8a4b13, 1);
    g.fillEllipse(x + 72 * scale, y + 64 * scale, 28 * scale, 40 * scale);
    g.fillStyle(0xd89a38, 1);
    g.fillEllipse(x + 72 * scale, y + 50 * scale, 28 * scale, 13 * scale);

    // Float animation
    this.tweens.add({
      targets: [g, glow],
      y: "+=7",
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}