import Phaser from "phaser";
import SaveManager from "../managers/SaveManager.js";
import LEVELS from "../levels/LevelData.js";
import SoundManager from "../managers/SoundManager.js";

// ─────────────────────────────────────────────────────────────────
// Touch detection
// ─────────────────────────────────────────────────────────────────
const IS_TOUCH =
  typeof window !== "undefined" &&
  (navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window ||
    window.matchMedia("(pointer: coarse)").matches);

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  // ─────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────
  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // ── UI scale factor ──────────────────────────────────────────
    const isPortrait = h > w;
    const refDim = isPortrait ? w : Math.min(w, h);
    const ui = Phaser.Math.Clamp(refDim / 680, 0.48, 1.2);

    // ── Column count: solve for cols so each card is tall enough ─
    // We need cellH >= MIN_CELL_H. Compute the minimum cols that satisfies this.
    // Doing this forward-and-back ensures portrait phones never end up with 7 rows.
    const MIN_CELL_H = 82; // minimum card height in px for readable text
    const headerH_est = Math.max(94, Math.round(104 * ui));
    const bottomPad_est = Math.max(56, Math.round(68 * ui));
    const gridH_est = h - headerH_est - Math.round(28 * ui) - bottomPad_est;

    // Start from a device-width-based preference, then bump cols up if needed
    let cols = w < 340 ? 3 : w < 520 ? 4 : 5;
    let rows = Math.ceil(LEVELS.length / cols);

    // Bump cols up until cards are tall enough (max 5 cols)
    while (rows > 1 && cols < 5) {
      const gapY_est = Math.max(6, Math.round(gridH_est * 0.028));
      const testCellH = (gridH_est - gapY_est * (rows - 1)) / rows;
      if (testCellH >= MIN_CELL_H) break;
      cols++;
      rows = Math.ceil(LEVELS.length / cols);
    }

    this.cameras.main.setBackgroundColor("#080300");
    this._drawBackground(w, h);

    const headerH = this._drawHeader(w, h, ui);
    this._drawGrid(w, h, headerH, rows, cols, ui);
    this._backButton(w, h, ui);
  }

  // ─────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────
  _drawHeader(w, h, ui) {
    const isNarrow = w < 380;
    const headerH = Math.max(94, Math.round(104 * ui));

    // Glow
    this.add
      .ellipse(w / 2, headerH * 0.4, w * 0.85, headerH * 1.6, 0xff8c20, 0.12)
      .setDepth(1);

    // Shadow
    const shadow = this.add.graphics().setDepth(4);
    shadow.fillStyle(0x000000, 0.42);
    shadow.fillRoundedRect(16, 12, w - 32, headerH, 26);

    // Panel body
    const panel = this.add.graphics().setDepth(5);
    panel.fillGradientStyle(0x3e1c06, 0x3e1c06, 0x120700, 0x120700, 1);
    panel.fillRoundedRect(10, 8, w - 20, headerH, 26);

    // Gloss shimmer
    panel.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.14, 0.14, 0, 0);
    panel.fillRoundedRect(14, 12, w - 28, 22, 20);

    // Amber border
    panel.lineStyle(1.8, 0xffb84a, 0.8);
    panel.strokeRoundedRect(10, 8, w - 20, headerH, 26);

    // Inner hairline
    panel.lineStyle(1, 0xffe4a0, 0.15);
    panel.strokeRoundedRect(14, 12, w - 28, headerH - 8, 22);

    // Title
    const titleSize = Math.max(16, isNarrow ? Math.round(19 * ui) : Math.round(26 * ui));
    this.add
      .text(w / 2, Math.round(headerH * 0.31), "🐇  SELECT LEVEL  🐇", {
        fontSize: `${titleSize}px`,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontStyle: "bold",
        color: "#fff4e0",
        stroke: "#1a0800",
        strokeThickness: 7,
        shadow: { offsetX: 0, offsetY: 2, color: "#ff9020", blur: 16, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Acorn pill
    const total = SaveManager.getTotalStars();
    const pillW = Math.min(210, w * 0.54);
    const pillH = Math.max(26, Math.round(30 * ui));
    const pillY = Math.round(headerH * 0.63);

    const pill = this.add.graphics().setDepth(10);
    pill.fillGradientStyle(0x6b3510, 0x6b3510, 0x261004, 0x261004, 1);
    pill.fillRoundedRect(w / 2 - pillW / 2, pillY, pillW, pillH, pillH / 2);
    pill.lineStyle(1.4, 0xffc860, 0.75);
    pill.strokeRoundedRect(w / 2 - pillW / 2, pillY, pillW, pillH, pillH / 2);

    this.add
      .text(w / 2, pillY + pillH / 2, `🌰  ${total} / ${LEVELS.length * 3} ACORNS`, {
        fontSize: `${Math.max(10, Math.round(13 * ui))}px`,
        fontFamily: "'Georgia', serif",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(11);

    return headerH;
  }

  // ─────────────────────────────────────────────────────────────────
  // GRID
  // ─────────────────────────────────────────────────────────────────
  _drawGrid(w, h, headerH, rows, cols, ui) {
    const gridTop = headerH + Math.round(28 * ui);
    const bottomPad = Math.max(56, Math.round(68 * ui));
    const padX = Math.max(14, Math.round(w * 0.038));

    const gridW = w - padX * 2;
    const gridH = h - gridTop - bottomPad;

    const gapX = Math.max(5, Math.round(gridW * 0.022));
    const gapY = Math.max(5, Math.round(gridH * 0.025));

    const cellW = (gridW - gapX * (cols - 1)) / cols;
    const cellH = (gridH - gapY * (rows - 1)) / rows;

    LEVELS.forEach((lvl, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const cx = padX + col * (cellW + gapX) + cellW / 2;
      const cy = gridTop + row * (cellH + gapY) + cellH / 2;

      const stars = SaveManager.getStars(lvl.id);
      const unlocked = SaveManager.isUnlocked(lvl.id);

      this._levelCard(cx, cy, cellW, cellH, lvl, stars, unlocked, ui);
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // LEVEL CARD
  // ─────────────────────────────────────────────────────────────────
  _levelCard(cx, cy, cw, ch, lvl, stars, unlocked, ui) {
    const alpha = unlocked ? 1 : 0.48;

    const glowColor = stars === 3 ? 0xffd050 : stars > 0 ? 0xff9030 : 0x7a3b10;
    const topColor = !unlocked ? 0x160a02 : stars === 3 ? 0x7a5618 : 0x5a2c0d;
    const botColor = !unlocked ? 0x080300 : stars === 3 ? 0x2e1600 : 0x220e00;

    // Glow
    const glow = this.add
      .ellipse(cx, cy, cw * 1.3, ch * 1.6, glowColor, unlocked ? 0.13 : 0.04)
      .setDepth(8);

    // Shadow
    const shadow = this.add.graphics().setDepth(9);
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(cx - cw / 2 + 4, cy - ch / 2 + 5, cw, ch, 18);

    // Card body
    const card = this.add.graphics().setDepth(10);
    this._drawCard(card, cx, cy, cw, ch, topColor, botColor, unlocked, false);

    // ── Safe vertical layout ────────────────────────────────────
    // Every position is derived from the actual pixel height of the card,
    // so elements can NEVER overlap regardless of screen size.
    //
    // Layout (from card top edge, fractions of innerH):
    //   arch      0% – 14%
    //   number   14% – 52%   (center at 33%)
    //   name     55% – 72%   (center at 63%)  — hidden if card too short
    //   acorns   76% – 96%   (center at 86%)
    //
    const INNER_PAD = 4;
    const innerTop  = cy - ch / 2 + INNER_PAD;
    const innerH    = ch - INNER_PAD * 2;

    const archY   = innerTop + innerH * 0.08;
    const numY    = innerTop + innerH * 0.33;
    const nameY   = innerTop + innerH * 0.63;
    const acornY  = innerTop + innerH * 0.86;

    // Show name only when there is enough vertical room
    const showName = innerH >= 68;
    const showArch = innerH >= 52;

    // ── Arch ─────────────────────────────────────────────────────
    if (showArch) {
      const arch = this.add.graphics().setDepth(11).setAlpha(alpha * 0.85);
      arch.lineStyle(1.4, unlocked ? 0xffcf8a : 0x3a2010, unlocked ? 0.22 : 0.07);
      arch.strokeEllipse(cx, archY, cw * 0.54, innerH * 0.13);
    }

    // ── Level number ─────────────────────────────────────────────
    // Font capped at 42% of inner height so it never bleeds into name row
    const numMaxPx = innerH * 0.42;
    const numSize  = Math.max(11, Math.min(
      Math.round(26 * ui),
      Math.round(cw * 0.42),
      Math.round(numMaxPx)
    ));

    this.add
      .text(cx, numY, `${lvl.id}`, {
        fontSize: `${numSize}px`,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontStyle: "bold",
        color: unlocked ? "#fff2d2" : "#4a3520",
        stroke: "#120700",
        strokeThickness: Math.max(3, Math.round(4 * ui)),
      })
      .setOrigin(0.5)
      .setAlpha(alpha)
      .setDepth(12);

    // ── Level name ───────────────────────────────────────────────
    if (showName) {
      const nameSize = Math.max(7, Math.min(
        Math.round(9 * ui),
        Math.round(cw * 0.12),
        Math.round(innerH * 0.14)        // never taller than 14% of inner height
      ));
      // Chars that safely fit in one line
      const charsPerLine = Math.max(1, Math.floor((cw - 6) / (nameSize * 0.65)));
      const displayName  = lvl.name.length > charsPerLine
        ? lvl.name.slice(0, charsPerLine - 1) + "…"
        : lvl.name;

      this.add
        .text(cx, nameY, displayName.toUpperCase(), {
          fontSize: `${nameSize}px`,
          fontFamily: "'Georgia', serif",
          fontStyle: "italic",
          color: unlocked ? "#c8a060" : "#503828",
        })
        .setOrigin(0.5)
        .setAlpha(alpha)
        .setDepth(12);
    }

    // ── Acorns ───────────────────────────────────────────────────
    const acornSpan = Math.min(cw * 0.56, 48);
    const acornStep = acornSpan / 2;
    const acornSize = Math.max(8, Math.min(Math.round(12 * ui), Math.round(innerH * 0.14)));
    const dotSize   = Math.max(10, Math.round(14 * ui));

    for (let s = 0; s < 3; s++) {
      const earned = s < stars;
      const ax = cx - acornSpan / 2 + s * acornStep;
      this.add
        .text(ax, acornY, earned ? "🌰" : "·", {
          fontSize: earned ? `${acornSize}px` : `${dotSize}px`,
          color: earned ? "#ffd060" : "#4a2810",
        })
        .setOrigin(0.5)
        .setAlpha(alpha)
        .setDepth(12);
    }

    // ── Lock ─────────────────────────────────────────────────────
    if (!unlocked) {
      const lockSize = Math.max(12, Math.min(Math.round(20 * ui), Math.round(ch * 0.28)));
      this.add
        .text(cx, cy + innerH * 0.05, "🔒", { fontSize: `${lockSize}px` })
        .setOrigin(0.5)
        .setDepth(13);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // INTERACTIVE ZONE
    // ─────────────────────────────────────────────────────────────
    const zone = this.add
      .zone(cx, cy, cw, ch)
      .setDepth(14)
      .setInteractive({ useHandCursor: !IS_TOUCH });

    const setHoverStyle = (on) => {
      card.clear();
      if (on) {
        this._drawCard(card, cx, cy, cw, ch, 0x8c541e, 0x341800, true, true);
        glow.setAlpha(0.3);
        this.tweens.killTweensOf(card);
       
      } else {
        this._drawCard(card, cx, cy, cw, ch, topColor, botColor, true, false);
        glow.setAlpha(0.13);
        this.tweens.killTweensOf(card);
        
      }
    };

    if (!IS_TOUCH) {
      zone.on("pointerover", () => { SoundManager.play("hover"); setHoverStyle(true); });
      zone.on("pointerout",  () => setHoverStyle(false));
    }

    zone.on("pointerdown", () => {
      if (IS_TOUCH) setHoverStyle(true);
      SoundManager.play("levelSelect");
      this.cameras.main.flash(180, 255, 200, 100, false);
      this.time.delayedCall(IS_TOUCH ? 160 : 120, () => {
        if (IS_TOUCH) setHoverStyle(false);
        this.scene.start("GameScene", { levelId: lvl.id });
      });
    });

    if (IS_TOUCH) {
      zone.on("pointerup",     () => setHoverStyle(false));
      zone.on("pointercancel", () => setHoverStyle(false));
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // CARD DRAW HELPER
  // ─────────────────────────────────────────────────────────────────
  _drawCard(card, cx, cy, cw, ch, topColor, botColor, unlocked, hovered) {
    const borderColor = hovered ? 0xffe8b8 : unlocked ? 0xffc070 : 0x3a2810;
    const borderAlpha = hovered ? 1 : unlocked ? 0.85 : 0.35;
    const borderWidth = hovered ? 2.5 : unlocked ? 1.8 : 1;
    const radius = Math.min(18, ch * 0.22);

    card.fillGradientStyle(topColor, topColor, botColor, botColor, 1);
    card.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, radius);

    card.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff,
      hovered ? 0.18 : 0.11, hovered ? 0.18 : 0.11, 0, 0);
    card.fillRoundedRect(cx - cw / 2 + 3, cy - ch / 2 + 3, cw - 6, ch * 0.27, radius - 2);

    card.lineStyle(borderWidth, borderColor, borderAlpha);
    card.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, radius);

    card.lineStyle(1, unlocked ? 0xffe8c0 : 0x2a1808, unlocked ? 0.14 : 0.07);
    card.strokeRoundedRect(cx - cw / 2 + 4, cy - ch / 2 + 4, cw - 8, ch - 8, Math.max(4, radius - 4));
  }

  // ─────────────────────────────────────────────────────────────────
  // BACK BUTTON
  // ─────────────────────────────────────────────────────────────────
  _backButton(w, h, ui) {
    // Hard minimums — pill is NEVER narrower than 96px or shorter than 36px
    // (previously Math.round(90*ui) → ~47px at low ui, clipping the label)
    const btnH = Math.max(25, Math.round(35 * ui));
    const btnW = Math.max(96, Math.round(108 * ui));
    const radius = btnH / 2;

    const padX = Math.max(14, Math.round(w * 0.038));
    const padY = Math.max(10, Math.round(h * 0.016));

    // bx = left edge; clampedBy = vertical center, clamped so pill stays on screen
    const bx = padX;
    const rawBy = h - padY - btnH / 2;
    const clampedBy = Phaser.Math.Clamp(rawBy, btnH / 2 + 4, h - btnH / 2 - 4);

    const pill = this.add.graphics().setDepth(28);

    const drawPill = (active) => {
      pill.clear();
      if (active) {
        pill.fillGradientStyle(0x7a3810, 0x7a3810, 0x2c1204, 0x2c1204, 1);
        pill.fillRoundedRect(bx, clampedBy - btnH / 2, btnW, btnH, radius);
        pill.lineStyle(1.8, 0xffe8a0, 0.9);
        pill.strokeRoundedRect(bx, clampedBy - btnH / 2, btnW, btnH, radius);
      } else {
        pill.fillGradientStyle(0x4a2008, 0x4a2008, 0x180900, 0x180900, 1);
        pill.fillRoundedRect(bx, clampedBy - btnH / 2, btnW, btnH, radius);
        pill.lineStyle(1.4, 0xffb84a, 0.65);
        pill.strokeRoundedRect(bx, clampedBy - btnH / 2, btnW, btnH, radius);
      }
    };

    drawPill(false);

    const txtSize = Math.max(10, Math.round(14 * ui));
    const txt = this.add
      .text(bx + btnW / 2, clampedBy, "← BACK", {
        fontSize: `${txtSize}px`,
        fontFamily: "'Georgia', serif",
        fontStyle: "bold",
        color: "#ffd898",
        stroke: "#1a0800",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(29);

    // Touch target meets the 44×44 minimum
    const zoneW = Math.max(btnW + 16, 44);
    const zoneH = Math.max(btnH + 12, 44);
    const zone  = this.add
      .zone(bx + btnW / 2, clampedBy, zoneW, zoneH)
      .setDepth(30)
      .setInteractive({ useHandCursor: !IS_TOUCH });

    const setActive = (on) => {
      drawPill(on);
      txt.setColor(on ? "#fff4d0" : "#ffd898").setScale(on ? 1.04 : 1);
    };

    if (!IS_TOUCH) {
      zone.on("pointerover", () => { setActive(true); SoundManager.play("hover"); });
      zone.on("pointerout",  () => setActive(false));
    }

    zone.on("pointerdown", () => {
      setActive(true);
      SoundManager.play("click");
      this.cameras.main.flash(120, 60, 20, 10, false);
      this.time.delayedCall(110, () => {
        setActive(false);
        this.scene.start("MenuScene");
      });
    });

    if (IS_TOUCH) {
      zone.on("pointerup",     () => setActive(false));
      zone.on("pointercancel", () => setActive(false));
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // BACKGROUND
  // ─────────────────────────────────────────────────────────────────
  _drawBackground(w, h) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x190a00, 0x190a00, 0x040100, 0x040100, 1);
    bg.fillRect(0, 0, w, h);

    this.add.ellipse(w / 2, h * 0.7, w * 0.95, h * 0.5, 0xff8c20, 0.07).setDepth(1);
    this.add.ellipse(w * 0.2, h * 0.3, w * 0.4, h * 0.28, 0xff6010, 0.05).setDepth(1);
    this.add.ellipse(w * 0.82, h * 0.5, w * 0.35, h * 0.22, 0xffaa30, 0.04).setDepth(1);

    const vig = this.add.graphics().setDepth(2);
    vig.fillStyle(0x000000, 0.28);
    vig.fillRect(0, 0, w, 50);
    vig.fillRect(0, h - 60, w, 60);
    vig.fillRect(0, 0, 45, h);
    vig.fillRect(w - 45, 0, 45, h);

    const strata = [0x130700, 0x1c0d00, 0x251300, 0x2f1a00, 0x3a2200];
    for (let i = 0; i < strata.length; i++) {
      const g = this.add.graphics().setDepth(3);
      g.fillStyle(strata[i], 1);
      const yBase = h * (0.58 + i * 0.08);
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w + 40; x += 30) {
        g.lineTo(x, yBase + Math.sin(x * 0.013 + i * 1.1) * 15 + Math.cos(x * 0.021 + i * 0.7) * 7);
      }
      g.lineTo(w + 40, h); g.lineTo(0, h); g.closePath(); g.fillPath();
    }

    for (let i = 0; i < 48; i++) {
      const mote = this.add
        .circle(Math.random() * w, Math.random() * h,
          Phaser.Math.FloatBetween(0.5, 2.2),
          Phaser.Math.RND.pick([0xffd070, 0xfffbc0, 0xffb040]),
          Phaser.Math.FloatBetween(0.03, 0.2))
        .setDepth(5);
      this.tweens.add({
        targets: mote, y: mote.y - Phaser.Math.Between(14, 40), alpha: 0,
        duration: Phaser.Math.Between(4000, 8000), repeat: -1, delay: Math.random() * 5000,
      });
    }

    for (let i = 0; i < 40; i++) {
      const crystal = this.add
        .circle(Math.random() * w, Math.random() * h * 0.5,
          Phaser.Math.FloatBetween(0.5, 1.8), 0xfff6dc,
          Phaser.Math.FloatBetween(0.14, 0.44))
        .setDepth(4);
      this.tweens.add({
        targets: crystal, alpha: Phaser.Math.FloatBetween(0.02, 0.1),
        duration: Phaser.Math.Between(1800, 5000), yoyo: true, repeat: -1, delay: Math.random() * 3000,
      });
    }

    const roots = this.add.graphics().setDepth(6);
    for (let i = 0; i < 14; i++) {
      roots.lineStyle(
        Phaser.Math.FloatBetween(1, 2.2),
        Phaser.Math.RND.pick([0x4a2406, 0x3a1c04, 0x5e3010]),
        Phaser.Math.FloatBetween(0.12, 0.28)
      );
      roots.beginPath();
      let rx = Phaser.Math.Between(0, w), ry = Phaser.Math.Between(0, h * 0.45);
      roots.moveTo(rx, ry);
      for (let j = 0; j < 12; j++) {
        rx += Phaser.Math.Between(-28, 28);
        ry += Phaser.Math.Between(16, 34);
        roots.lineTo(rx, ry);
      }
      roots.strokePath();
    }
  }
}