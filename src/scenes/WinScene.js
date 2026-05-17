import Phaser from "phaser";
import SoundManager from "../managers/SoundManager.js";

export default class WinScene extends Phaser.Scene {
  constructor() { super("WinScene"); }

  create(data) {
    const W = this.scale.width;
    const H = this.scale.height;

    const {
      levelId,
      stars,
      coinsCollected,
      totalCoins,
      paintUsed,
      paintMax,
      hasNext,
    } = data;

    // ─────────────────────────────────────────────────────────────
    // SCALE + FIT  (same two-pass system as MenuScene)
    // ─────────────────────────────────────────────────────────────
    const isPortrait = H > W;
    const baseSide   = isPortrait ? W : Math.min(W, H);
    const ui         = Phaser.Math.Clamp(baseSide / 680, 0.48, 1.15);

    // Raw sizes at ui scale
    const titleSize0 = Phaser.Math.Clamp(32 * ui, 18, 40);
    const subSize0   = Phaser.Math.Clamp(15 * ui, 11, 20);
    const starZone0  = Phaser.Math.Clamp(80 * ui, 64, 96);   // height reserved for star row
    const statH0     = Phaser.Math.Clamp(38 * ui, 30, 46);   // height per stat row
    const btnH0      = Phaser.Math.Clamp(52 * ui, 40, 64);
    const btnGap0    = Phaser.Math.Clamp(12 * ui,  8, 18);
    const CARD_PAD   = Phaser.Math.Clamp(18 * ui, 12, 24);

    const numStats   = 3;
    const numBtns    = hasNext ? 3 : 3;   // next/retry/map  OR  retry/map + label

    const rawTotal =
      CARD_PAD +
      titleSize0 + 6 +
      subSize0   + 14 +
      starZone0  + 14 +
      numStats * statH0 + (numStats - 1) * 6 + 18 +
      (hasNext ? btnH0 + btnGap0 : Phaser.Math.Clamp(34 * ui, 24, 40) + btnGap0) +
      btnH0 + btnGap0 +
      btnH0 +
      CARD_PAD;

    const available = H * 0.96;
    const fit       = rawTotal > available
      ? Phaser.Math.Clamp(available / rawTotal, 0.64, 1)
      : 1;
    const uiFit     = ui * fit;

    // Final sizes
    const titleSize  = Math.round(titleSize0 * fit);
    const subSize    = Math.round(subSize0   * fit);
    const starZone   = Math.round(starZone0  * fit);
    const statH      = Math.round(statH0     * fit);
    const btnH       = Math.round(btnH0      * fit);
    const btnGap     = Math.round(btnGap0    * fit);
    const cardPad    = Math.round(CARD_PAD   * fit);

    const totalContent =
      cardPad +
      titleSize + Math.round(6 * fit) +
      subSize   + Math.round(14 * fit) +
      starZone  + Math.round(14 * fit) +
      numStats * statH + (numStats - 1) * Math.round(6 * fit) + Math.round(18 * fit) +
      (hasNext ? btnH + btnGap : Math.round(34 * fit) + btnGap) +
      btnH + btnGap +
      btnH +
      cardPad;

    // Card geometry
    const cardW  = Phaser.Math.Clamp(W * 0.88, 280, 500);
    const cardH  = Math.min(totalContent, H * 0.96);
    const cardX  = W / 2 - cardW / 2;
    const cardY  = (H - cardH) / 2;

    // ─────────────────────────────────────────────────────────────
    // BACKGROUND LAYER
    // ─────────────────────────────────────────────────────────────
    this._drawCelebrationBg(W, H, stars);

    // ─────────────────────────────────────────────────────────────
    // CARD  — rich layered wood-plank aesthetic
    // ─────────────────────────────────────────────────────────────
    this._drawCard(cardX, cardY, cardW, cardH, uiFit);

    // ─────────────────────────────────────────────────────────────
    // LAYOUT  — top-down inside card
    // ─────────────────────────────────────────────────────────────
    let y = cardY + cardPad;

    // ── TITLE ───────────────────────────────────────────────────
    this.add.text(W / 2, y, "TUNNEL CLEARED!", {
      fontSize: `${titleSize}px`,
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: "900",
      color: "#ffe088",
      stroke: "#1a0800",
      strokeThickness: Math.max(3, Math.ceil(6 * uiFit)),
    }).setOrigin(0.5, 0).setDepth(10);

    y += titleSize + Math.round(6 * fit);

    this.add.text(W / 2, y, `Level ${levelId}`, {
      fontSize: `${subSize}px`,
      fontFamily: "Arial, sans-serif",
      color: "#c8a060",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(10);

    y += subSize + Math.round(14 * fit);

    // ── STARS ROW ───────────────────────────────────────────────
    const starR    = Math.round(Phaser.Math.Clamp(26 * uiFit, 18, 32));
    const starGap  = Math.round(starR * 2.6);
    const starCY   = y + starZone / 2;

    for (let i = 0; i < 3; i++) {
      const sx     = W / 2 + (i - 1) * starGap;
      const filled = i < stars;

      // Ring
      const ring = this.add.graphics().setDepth(9);
      ring.lineStyle(Math.max(2, Math.ceil(2.5 * uiFit)), filled ? 0xd4780a : 0x3a2010, filled ? 0.9 : 0.3);
      ring.strokeCircle(sx, starCY, starR + 4);

      // Fill circle
      const disc = this.add.circle(sx, starCY, starR, filled ? 0x3d1800 : 0x12080a, 1).setDepth(9);

      // Icon text
      const icon = this.add.text(sx, starCY, filled ? "🌰" : "○", {
        fontSize: `${Math.round(starR * 1.3)}px`,
        color: filled ? "#e8c87a" : "#3a2010",
      }).setOrigin(0.5).setDepth(11).setScale(0);

      this.tweens.add({
        targets: icon,
        scaleX: 1, scaleY: 1,
        duration: 300,
        delay: 450 + i * 200,
        ease: "Back.easeOut",
      });

      if (filled) {
        this.time.delayedCall(450 + i * 200, () => {
          this.cameras.main.shake(70, 0.006);
          this._starBurst(sx, starCY);
        });
      }
    }

    y += starZone + Math.round(14 * fit);

    // ── STATS PANEL ─────────────────────────────────────────────
    const statW  = cardW - Math.round(20 * uiFit) * 2;
    const statX  = W / 2 - statW / 2;

    const rows = [
      { label: "Acorns Found",  val: `${coinsCollected} / ${totalCoins}`, icon: "🌰" },
      { label: "Dirt Dug",      val: `${paintUsed} / ${paintMax}`,        icon: "⛏" },
      { label: "Tunnel Rating", val: "🌰".repeat(stars) + "○".repeat(3 - stars), icon: "⭐" },
    ];

    const labelSize = Math.max(9,  Math.round(13 * uiFit));
    const valSize   = Math.max(10, Math.round(15 * uiFit));

    rows.forEach((row, i) => {
      const ry = y + i * (statH + Math.round(6 * fit));

      // Row card
      const rg = this.add.graphics().setDepth(8);
      rg.fillStyle(0x1e0e00, 0.75);
      rg.fillRoundedRect(statX, ry, statW, statH, Math.round(8 * uiFit));
      rg.lineStyle(1, 0x8a5020, 0.35);
      rg.strokeRoundedRect(statX, ry, statW, statH, Math.round(8 * uiFit));
      // Top shine
      rg.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.05, 0.05, 0, 0);
      rg.fillRoundedRect(statX + 2, ry + 2, statW - 4, statH * 0.35, Math.round(7 * uiFit));

      const midY = ry + statH / 2;

      this.add.text(statX + Math.round(14 * uiFit), midY, row.label, {
        fontSize: `${labelSize}px`,
        fontFamily: "Arial, sans-serif",
        color: "#c8a060",
      }).setOrigin(0, 0.5).setDepth(11);

      this.add.text(statX + statW - Math.round(12 * uiFit), midY, row.val, {
        fontSize: `${valSize}px`,
        fontFamily: "'Arial Black', Arial, sans-serif",
        fontStyle: "bold",
        color: "#ffe088",
        stroke: "#1a0800",
        strokeThickness: Math.max(1, Math.ceil(3 * uiFit)),
      }).setOrigin(1, 0.5).setDepth(11);
    });

    y += numStats * statH + (numStats - 1) * Math.round(6 * fit) + Math.round(18 * fit);

    // ── BUTTONS ─────────────────────────────────────────────────
    const btnW = Phaser.Math.Clamp(cardW * 0.86, 200, 380);

    if (hasNext) {
      this._premiumButton(
        W / 2, y + btnH / 2, btnW, btnH,
        "▶  DIG DEEPER",
        { base: 0xb85500, top: 0xf07820, border: 0xffd898 },
        uiFit, true,
        () => { this.scene.start("GameScene", { levelId: levelId + 1 }); }
      );
      y += btnH + btnGap;
    } else {
      const allClearSize = Math.max(10, Math.round(13 * uiFit));
      this.add.text(W / 2, y + Math.round(17 * fit), "🐾  All 20 tunnels explored!  🐾", {
        fontSize: `${allClearSize}px`,
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        color: "#ffe088",
        stroke: "#000",
        strokeThickness: 2,
        align: "center",
      }).setOrigin(0.5).setDepth(11);
      y += Math.round(34 * fit) + btnGap;
    }

    this._premiumButton(
      W / 2, y + btnH / 2, btnW, btnH,
      "↺  RETRY TUNNEL",
      { base: 0x1e1a40, top: 0x2e2a60, border: 0x6060cc },
      uiFit, false,
      () => { this.scene.start("GameScene", { levelId }); }
    );

    y += btnH + btnGap;

    this._premiumButton(
      W / 2, y + btnH * 0.85 / 2, btnW, Math.round(btnH * 0.85),
      "☰  TUNNEL MAP",
      { base: 0x1a0e00, top: 0x2e1a08, border: 0x8a5020 },
      uiFit, false,
      () => { this.scene.start("LevelSelectScene"); }
    );

    // Keyboard shortcut
    this.input.keyboard.once("keydown-SPACE", () => {
      if (hasNext) this.scene.start("GameScene", { levelId: levelId + 1 });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CELEBRATION BACKGROUND
  // ═══════════════════════════════════════════════════════════════
  _drawCelebrationBg(W, H, stars) {
    // Deep vignette overlay
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x000000, 0.80);
    bg.fillRect(0, 0, W, H);

    // Warm radial glow from centre — intensity based on stars earned
    const glowAlpha = 0.04 + stars * 0.03;
    const glow = this.add.ellipse(W / 2, H / 2, W * 1.1, H * 0.9, 0xff9030, glowAlpha);
    glow.setDepth(1);

    // Particle rain — earthy celebration
    const colors = [0xd4780a, 0x8a5020, 0xc8a060, 0x5a3010, 0xe8c87a, 0xf0b040];
    for (let i = 0; i < 38; i++) {
      const px   = Math.random() * W;
      const size = Phaser.Math.Between(4, 12);
      const p    = this.add.circle(px, -size, size, colors[i % colors.length], 0.82).setDepth(2);
      this.tweens.add({
        targets: p,
        y: H + size + 20,
        x: px + Phaser.Math.Between(-60, 60),
        alpha: 0,
        duration: 1500 + Math.random() * 1400,
        delay: Math.random() * 900,
        repeat: 1,
        ease: "Linear",
      });
    }

    // Firefly glints
    for (let i = 0; i < 18; i++) {
      const ff = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        Phaser.Math.FloatBetween(1, 2.8),
        0xffe060,
        Phaser.Math.FloatBetween(0.2, 0.6)
      ).setDepth(3);
      this.tweens.add({
        targets: ff,
        alpha: 0.02,
        y: ff.y - Phaser.Math.Between(15, 40),
        duration: Phaser.Math.Between(2000, 5000),
        yoyo: true, repeat: -1,
        delay: Math.random() * 3000,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CARD
  // ═══════════════════════════════════════════════════════════════
  _drawCard(cx, cy, cw, ch, uiFit) {
    const r = Math.round(16 * uiFit);

    // Outer drop shadow
    const shadow = this.add.graphics().setDepth(4);
    shadow.fillStyle(0x000000, 0.55);
    shadow.fillRoundedRect(cx + 5, cy + 8, cw, ch, r);

    // Ambient glow behind card
    const aura = this.add.ellipse(cx + cw / 2, cy + ch / 2, cw * 1.15, ch * 0.6, 0xff8c30, 0.07).setDepth(4);

    // Card body gradient
    const card = this.add.graphics().setDepth(5);
    card.fillGradientStyle(0x2c1400, 0x2c1400, 0x0e0600, 0x0e0600, 1);
    card.fillRoundedRect(cx, cy, cw, ch, r);

    // Inner top highlight band
    card.fillGradientStyle(0xffd080, 0xffd080, 0xffd080, 0xffd080, 0.07, 0.07, 0, 0);
    card.fillRoundedRect(cx + 3, cy + 3, cw - 6, ch * 0.18, r - 2);

    // Outer border
    card.lineStyle(Math.max(2, Math.ceil(2.5 * uiFit)), 0xd4780a, 0.90);
    card.strokeRoundedRect(cx, cy, cw, ch, r);

    // Inner border
    card.lineStyle(1, 0x8a5020, 0.30);
    card.strokeRoundedRect(cx + 5, cy + 5, cw - 10, ch - 10, r - 2);

    // Wood grain lines (subtle)
    card.lineStyle(0.6, 0x3a1a00, 0.18);
    const grainCount = 5;
    for (let i = 1; i <= grainCount; i++) {
      const gy = cy + (ch / (grainCount + 1)) * i;
      card.lineBetween(cx + 14, gy, cx + cw - 14, gy);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STAR BURST PARTICLES
  // ═══════════════════════════════════════════════════════════════
  _starBurst(sx, sy) {
    for (let p = 0; p < 7; p++) {
      const ang  = (p / 7) * Math.PI * 2;
      const dist = Phaser.Math.Between(22, 36);
      const dot  = this.add.circle(sx, sy, Phaser.Math.Between(3, 5), 0xd4780a).setDepth(20);
      this.tweens.add({
        targets: dot,
        x: sx + Math.cos(ang) * dist,
        y: sy + Math.sin(ang) * dist,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 380,
        ease: "Power2",
        onComplete: () => dot.destroy(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PREMIUM BUTTON  (matches MenuScene style)
  // ═══════════════════════════════════════════════════════════════
  _premiumButton(cx, cy, bw, bh, label, colors, uiFit, big, callback) {
    const radius   = Math.round(bh * 0.40);
    const fontSize = big
      ? Math.max(13, Math.round(19 * uiFit))
      : Math.max(11, Math.round(15 * uiFit));

    // Ambient glow
    const glow = this.add.ellipse(cx, cy, bw * 0.88, bh * 2.0, colors.base, 0.18).setDepth(13);

    // Drop shadow
    const shadow = this.add.graphics().setDepth(14);
    shadow.fillStyle(0x000000, 0.45);
    shadow.fillRoundedRect(cx - bw / 2 + 3, cy - bh / 2 + 6, bw, bh, radius);

    // Face graphics (redrawn on hover/press)
    const face = this.add.graphics().setDepth(15);

    const bevelColor = Phaser.Display.Color.ValueToColor(colors.base).darken(45).color;

    const drawFace = (topColor) => {
      face.clear();
      // Bevel
      face.fillStyle(bevelColor, 1);
      face.fillRoundedRect(cx - bw / 2, cy - bh / 2 + 4, bw, bh, radius);
      // Main surface
      const dark = Phaser.Display.Color.ValueToColor(topColor).darken(26).color;
      face.fillGradientStyle(topColor, topColor, dark, dark, 1);
      face.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh - 4, radius);
      // Top highlight
      face.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.11, 0.11, 0, 0);
      face.fillRoundedRect(cx - bw / 2 + 5, cy - bh / 2 + 3, bw - 10, (bh - 4) * 0.36, radius - 2);
      // Border
      face.lineStyle(Math.max(1, Math.ceil(1.8 * uiFit)), colors.border, 0.80);
      face.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, radius);
    };

    drawFace(colors.top);

    const txt = this.add.text(cx, cy - 1, label, {
      fontSize: `${fontSize}px`,
      fontFamily: "'Arial Black', Arial, sans-serif",
      fontStyle: "900",
      color: "#fff8ec",
      stroke: "#1a0800",
      strokeThickness: Math.max(2, Math.ceil(big ? 5 * uiFit : 4 * uiFit)),
    }).setOrigin(0.5).setDepth(18);

    // Hit zone
    const zone = this.add.zone(cx, cy, bw, bh).setInteractive().setDepth(19);

    zone.on("pointerover", () => {
      const hov = Phaser.Display.Color.ValueToColor(colors.top).lighten(15).color;
      drawFace(hov);
      glow.setAlpha(0.30);
      txt.setScale(1.04);
      SoundManager.play("hover");
    });

    zone.on("pointerout", () => {
      drawFace(colors.top);
      glow.setAlpha(0.18);
      txt.setScale(1);
    });

    zone.on("pointerdown", () => {
      // Press-in effect
      face.clear();
      const dark = Phaser.Display.Color.ValueToColor(colors.base).darken(28).color;
      face.fillGradientStyle(dark, dark, colors.base, colors.base, 1);
      face.fillRoundedRect(cx - bw / 2, cy - bh / 2 + 4, bw, bh - 4, radius);
      face.lineStyle(Math.max(1, Math.ceil(1.8 * uiFit)), colors.border, 0.60);
      face.strokeRoundedRect(cx - bw / 2, cy - bh / 2 + 4, bw, bh - 4, radius);
      txt.setY(cy + 3).setScale(0.97);
      SoundManager.play("click");
      this.time.delayedCall(110, () => {
        drawFace(colors.top);
        txt.setY(cy - 1).setScale(1);
        callback();
      });
    });
  }
}