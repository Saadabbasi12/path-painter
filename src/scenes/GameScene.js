import Phaser from "phaser";
import LEVELS from "../levels/LevelData.js";
import SaveManager from "../managers/SaveManager.js";
import SoundManager from "../managers/SoundManager.js";
import YT from "../managers/YouTubeSDK.js";

const STATE = { DRAWING: "drawing", RUNNING: "running", DEAD: "dead", WIN: "win" };

export default class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  init(data) {
    this.levelId = data.levelId || 1;
  }

  create() {
    const w = this.W = this.scale.width;
    const h = this.H = this.scale.height;

    this.levelData   = LEVELS.find(l => l.id === this.levelId);

    // Scale paint budget for screen width
    this.paintMax = this.levelData.paint * (w / 390);

    this.state          = STATE.DRAWING;
    this.drawnPoints    = [];
    this.pathIndex      = 0;
    this.pathT          = 0;
    this.paintUsed      = 0;
    this.coinsCollected = 0;
    this.gatesState     = {};
    this.movingObsData  = [];
    this.isDrawing      = false;

    const lvl = this.levelData;

    // Init gate states
    (lvl.gates || []).forEach(g => {
      this.gatesState[g.id] = g.open;
    });

    // ── Background ─────────────────────────────────────────────
    this._drawBackground();

    // ── Layer graphics ─────────────────────────────────────────
    this.costZoneGfx    = this.add.graphics().setDepth(2);
    this.pathGfx        = this.add.graphics().setDepth(5);
    this.obstacleGfx    = this.add.graphics().setDepth(6);
    this.collectibleGfx = this.add.graphics().setDepth(7);
    this.gateGfx        = this.add.graphics().setDepth(8);
    this.switchGfx      = this.add.graphics().setDepth(8);
    this.playerGfx      = this.add.graphics().setDepth(10);
    this.goalGfx        = this.add.graphics().setDepth(6);
    this.uiGfx          = this.add.graphics().setDepth(20);

    // Draw static elements
    this._drawCostZones();
    this._drawObstacles();
    this._drawGoal();
    this._drawCollectibles();
    this._drawGates();
    this._drawSwitches();
    this._initMovingObstacles();
    this._drawPlayer();
    this._buildUI();

    // ── Input ─────────────────────────────────────────────────
    this.input.on("pointerdown", this._onDown, this);
    this.input.on("pointermove", this._onMove, this);
    this.input.on("pointerup",   this._onUp,   this);

    // ── Sound ──────────────────────────────────────────────────
    SoundManager.init();
    SoundManager.play('ambientStart');

    // Footstep ticker — fires while RUNNING
    this._stepTimer = this.time.addEvent({
      delay: 210,
      loop: true,
      callback: () => {
        if (this.state === STATE.RUNNING) SoundManager.play('step');
      },
    });

    const isMobile = w < 700;

    // Hint text — premium pill
    const hintStr = "✦  Draw a path from the rabbit to the carrot  ✦";
    this.hintText = this.add.text(w/2, h - 26, hintStr, {
      fontSize: isMobile ? "11px" : "13px",
      fontStyle: "bold",
      color: "#e8c870",
      stroke: "#0a0500",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25).setAlpha(0.92);

    this.time.delayedCall(3000, () => {
      if (this.hintText) this.tweens.add({ targets: this.hintText, alpha:0, duration:800 });
    });
  }

  // ──────────────────────────────────────────────────────────────
  _drawBackground() {
    const w = this.W, h = this.H;

    // Base underground dark earth
    this.add.rectangle(w/2, h/2, w, h, 0x120800).setDepth(0);

    // Tunnel cross-section — lighter central area representing the
    // open tunnel space, surrounded by darker dense earth
    const tunnelG = this.add.graphics().setDepth(0);

    // Ceiling dirt layer
    tunnelG.fillStyle(0x1a0c02, 1);
    tunnelG.fillRect(0, 0, w, h*0.25);

    // Floor dirt layer
    tunnelG.fillStyle(0x160a00, 1);
    tunnelG.fillRect(0, h*0.78, w, h*0.22);

    // Left/right earth walls
    tunnelG.fillStyle(0x1a0c02, 1);
    tunnelG.fillRect(0, 0, w*0.05, h);
    tunnelG.fillRect(w*0.95, 0, w*0.05, h);

    // Central tunnel area — slightly warmer/lighter to suggest open space
    tunnelG.fillStyle(0x1e1000, 0.6);
    tunnelG.fillEllipse(w/2, h/2, w*0.9, h*0.7);

    // Ambient warm light source (candle/lantern feel)
    const lightG = this.add.graphics().setDepth(1);
    lightG.fillStyle(0xff7700, 0.04);
    lightG.fillEllipse(w*0.5, h*0.5, w*0.8, h*0.6);
    lightG.fillStyle(0xff9900, 0.02);
    lightG.fillEllipse(w*0.5, h*0.5, w*0.5, h*0.4);


    // Floor stones and pebbles
    this._drawFloorDetails(w, h);

    // Wall texture — irregular dirt patches
    this._drawWallTexture(w, h);
  }



  _drawFloorDetails(w, h) {
    const g = this.add.graphics().setDepth(1);
    // Pebbles on the floor
    g.fillStyle(0x3a2010, 0.6);
    for (let i = 0; i < 18; i++) {
      const px = Math.random()*w;
      const py = h*0.8 + Math.random()*h*0.15;
      g.fillEllipse(px, py, 4+Math.random()*10, 3+Math.random()*6);
    }
    // Floor line / ground level
    g.lineStyle(2, 0x4a2808, 0.3);
    g.beginPath();
    g.moveTo(0, h*0.8);
    for (let x = 0; x <= w; x += 16) {
      g.lineTo(x, h*0.8 + Math.sin(x*0.05)*3);
    }
    g.strokePath();
  }

  _drawWallTexture(w, h) {
    const g = this.add.graphics().setDepth(1);
    // Side wall root networks
    const sideRoots = [[0, h*0.3], [0, h*0.6], [w, h*0.25], [w, h*0.65]];
    sideRoots.forEach(([sx, sy]) => {
      g.lineStyle(1.5, 0x4a2808, 0.3);
      g.beginPath();
      g.moveTo(sx, sy);
      const nx = sx === 0 ? w*0.12 + Math.random()*w*0.1 : w*0.88 - Math.random()*w*0.1;
      g.lineTo(nx, sy + (Math.random()-0.5)*h*0.2);
      g.strokePath();
    });
    // Dirt blob patches
    g.fillStyle(0x1a0c00, 0.4);
    g.fillEllipse(w*0.08, h*0.45, 60, 100);
    g.fillEllipse(w*0.92, h*0.5,  60, 80);
  }

  // ──────────────────────────────────────────────────────────────
  _s(v, dim) { return v * (dim === 'x' ? this.W : this.H); }
  _sx(v)     { return v * this.W; }
  _sy(v)     { return v * this.H; }

 _drawObstacles() {
  const g = this.obstacleGfx;
  g.clear();

  const lvl = this.levelData;

  (lvl.obstacles || []).forEach(obs => {
    const x = this._sx(obs.x);
    const y = this._sy(obs.y);
    const w = this._sx(obs.w);
    const h = this._sy(obs.h);

    // =========================================================
    // PREMIUM BRICK WALL
    // =========================================================
    if (obs.type === "wall") {
      const left  = x - w / 2;
      const top   = y - h / 2;

      // ── Deep drop shadow ──────────────────────────────────
      g.fillStyle(0x000000, 0.35);
      g.fillRoundedRect(left + 5, top + 7, w, h, 4);

      // ── Overall wall base ─────────────────────────────────
      g.fillStyle(0x2c1a10, 1);
      g.fillRoundedRect(left, top, w, h, 4);

      // ── Brick rows ────────────────────────────────────────
      const brickH   = Math.max(9, Math.floor(h / Math.max(2, Math.round(h / 14))));
      const mortar   = 3;
      const rows     = Math.floor(h / (brickH + mortar));
      const brickW   = Math.max(20, Math.floor(w / 2.4));

      for (let row = 0; row < rows; row++) {
        const by     = top + mortar / 2 + row * (brickH + mortar);
        const offset = (row % 2 === 0) ? 0 : brickW * 0.5;
        const cols   = Math.ceil((w + brickW) / (brickW + mortar)) + 1;

        for (let col = -1; col < cols; col++) {
          const bx = left + offset + col * (brickW + mortar);

          // Clip bricks to wall bounds
          const cx0 = Math.max(bx, left);
          const cy0 = Math.max(by, top);
          const cx1 = Math.min(bx + brickW, left + w);
          const cy1 = Math.min(by + brickH, top + h);
          if (cx1 <= cx0 || cy1 <= cy0) continue;

          const bw = cx1 - cx0;
          const bh = cy1 - cy0;

          // Brick body — alternating warm tones for natural variation
          const shade = (row + col) % 3;
          const baseColor = shade === 0 ? 0x8b3a22 : shade === 1 ? 0x7a3020 : 0x9c4428;
          g.fillStyle(baseColor, 1);
          g.fillRect(cx0 + 1, cy0 + 1, bw - 2, bh - 2);

          // Top highlight (light catching top face)
          g.fillStyle(0xc86040, 0.28);
          g.fillRect(cx0 + 1, cy0 + 1, bw - 2, Math.floor(bh * 0.3));

          // Left bevel catch
          g.fillStyle(0xff8860, 0.10);
          g.fillRect(cx0 + 1, cy0 + 1, 3, bh - 2);

          // Bottom/right dark shadow edge
          g.fillStyle(0x1a0a06, 0.35);
          g.fillRect(cx0 + 1, cy0 + bh - 3, bw - 2, 2);
          g.fillRect(cx0 + bw - 3, cy0 + 1, 2, bh - 2);

          // Subtle surface noise mark
          if ((row * 3 + col * 7) % 5 === 0) {
            g.fillStyle(0x5a1c10, 0.22);
            g.fillRect(
              cx0 + 4 + ((row * 11 + col * 7) % Math.max(1, bw - 10)),
              cy0 + 2 + ((row * 5  + col * 3) % Math.max(1, bh - 5)),
              Math.min(6, bw - 5), Math.min(3, bh - 4)
            );
          }
        }
      }

      // ── Mortar joints (horizontal) ────────────────────────
      g.fillStyle(0x1e110a, 1);
      for (let row = 1; row < rows; row++) {
        const jy = top + mortar / 2 + row * (brickH + mortar) - mortar;
        g.fillRect(left + 1, jy, w - 2, mortar);
      }

      // ── Crisp outer border ────────────────────────────────
      g.lineStyle(2.5, 0x120806, 1);
      g.strokeRoundedRect(left, top, w, h, 4);

      // ── Subtle inner rim highlight ─────────────────────────
      g.lineStyle(1, 0xff9966, 0.10);
      g.strokeRoundedRect(left + 2, top + 2, w - 4, h - 4, 3);

      // ── Top sheen line ────────────────────────────────────
      g.lineStyle(1.5, 0xffffff, 0.07);
      g.lineBetween(left + 6, top + 3, left + w - 6, top + 3);
    }

    // =========================================================
    // PREMIUM SPIKES
    // =========================================================
    else if (obs.type === "spike") {

      const count = Math.max(2, Math.floor(w / 18));

      for (let i = 0; i < count; i++) {

        const sx =
          x - w / 2 +
          i * (w / count) +
          (w / count) / 2;

        // Shadow
        g.fillStyle(0x000000, 0.18);
        g.fillTriangle(
          sx - w / count / 2 + 2,
          y + h / 2 + 4,
          sx + w / count / 2 + 2,
          y + h / 2 + 4,
          sx + 2,
          y - h / 2 + 4
        );

        // Main spike
        g.fillStyle(0x5d3a1f, 1);

        g.fillTriangle(
          sx - w / count / 2,
          y + h / 2,
          sx + w / count / 2,
          y + h / 2,
          sx,
          y - h / 2
        );

        // Highlight
        g.fillStyle(0xb67a4a, 0.25);

        g.fillTriangle(
          sx - 2,
          y + h / 2 - 2,
          sx + 2,
          y + h / 2 - 2,
          sx,
          y - h / 2 + 8
        );

        // Edge
        g.lineStyle(1, 0x2b1608, 0.7);

        g.strokeTriangle(
          sx - w / count / 2,
          y + h / 2,
          sx + w / count / 2,
          y + h / 2,
          sx,
          y - h / 2
        );
      }
    }

    // =========================================================
    // PREMIUM WATER / MUD
    // =========================================================
    else if (obs.type === "water") {

      // Shadow
      g.fillStyle(0x000000, 0.18);
      g.fillRoundedRect(
        x - w / 2 + 4,
        y - h / 2 + 5,
        w,
        h,
        12
      );

      // Main mud
      g.fillStyle(0x3c2618, 1);
      g.fillRoundedRect(
        x - w / 2,
        y - h / 2,
        w,
        h,
        12
      );

      // Wet highlight
      g.fillStyle(0x7a5232, 0.22);
      g.fillRoundedRect(
        x - w / 2 + 4,
        y - h / 2 + 4,
        w - 8,
        h * 0.35,
        10
      );

      // Ripples
      g.lineStyle(2, 0xb98b61, 0.12);

      for (let i = 0; i < 3; i++) {
        g.strokeEllipse(
          x - w * 0.25 + i * (w * 0.25),
          y,
          w * 0.22,
          h * 0.12
        );
      }

      // Bubbles
      g.fillStyle(0xc59a74, 0.14);

      for (let i = 0; i < 6; i++) {
        g.fillCircle(
          x - w / 2 + 12 + Math.random() * (w - 24),
          y - h / 4 + Math.random() * (h / 2),
          Math.random() * 4 + 1
        );
      }

      // Border
      g.lineStyle(2, 0x1f1209, 0.8);

      g.strokeRoundedRect(
        x - w / 2,
        y - h / 2,
        w,
        h,
        12
      );
    }
  });
}

  _drawCostZones() {
    const g = this.costZoneGfx;
    g.clear();
    (this.levelData.costZones || []).forEach(zone => {
      const x = this._sx(zone.x), y = this._sy(zone.y);
      const w = this._sx(zone.w), h = this._sy(zone.h);
      // Dense packed earth — harder to dig through
      g.fillStyle(0x2a1800, 0.8);
      g.fillRect(x - w/2, y - h/2, w, h);
      // Compact soil texture
      g.fillStyle(0x3a2010, 0.4);
      for (let i = 0; i < 8; i++) {
        const bx = x - w/2 + Math.random()*w;
        const by = y - h/2 + Math.random()*h;
        g.fillCircle(bx, by, 3+Math.random()*6);
      }
      // Dense root network inside
      g.lineStyle(1, 0x5a3010, 0.3);
      g.lineBetween(x - w/2, y - h/4, x + w/2, y + h/4);
      g.lineBetween(x - w/4, y - h/2, x + w/4, y + h/2);
      g.lineStyle(1.5, 0x5a3010, 0.5);
      g.strokeRect(x - w/2, y - h/2, w, h);
      this.add.text(x, y - this._sy(zone.h)/2 - 12, `×${zone.cost} dig`, {
        fontSize:"11px", color:"#c8a060", stroke:"#000", strokeThickness:2
      }).setOrigin(0.5).setDepth(3);
    });
  }

 _drawGoal() {
  const g = this.goalGfx;
  const lvl = this.levelData;

  const gx = this._sx(lvl.goal.x);
  const gy = this._sy(lvl.goal.y);

  g.clear();

  const t = this.time.now * 0.004;
  const pulse = 0.5 + Math.sin(t) * 0.18;
  const bob = Math.sin(t * 1.4) * 2.5;

  // =====================================================
  // PREMIUM GROUND GLOW
  // =====================================================

  // Soft outer ambient glow
  g.fillStyle(0xff9b2f, 0.08);
  g.fillCircle(gx, gy + 4, 54);

  // Dark ground hole
  g.fillStyle(0x140804, 0.82);
  g.fillCircle(gx, gy + 5, 34);

  // Inner warm glow
  g.fillStyle(0xffa640, 0.12 + pulse * 0.08);
  g.fillCircle(gx, gy + 3, 28);

  // =====================================================
  // CARROT LEAVES
  // =====================================================

  const topY = gy - 26 + bob;

  // Left leaf
  g.fillStyle(0x2f9a42, 1);

  g.fillTriangle(
    gx - 4,
    topY + 12,
    gx - 18,
    topY - 16,
    gx - 1,
    topY - 8
  );

  // Middle leaf
  g.fillStyle(0x43b556, 1);

  g.fillTriangle(
    gx + 2,
    topY + 10,
    gx,
    topY - 24,
    gx + 12,
    topY - 6
  );

  // Right leaf
  g.fillStyle(0x2d8f3f, 1);

  g.fillTriangle(
    gx + 8,
    topY + 12,
    gx + 24,
    topY - 14,
    gx + 12,
    topY - 4
  );

  // Leaf highlights
  g.lineStyle(1.2, 0x9df0a8, 0.22);

  g.lineBetween(gx - 5, topY + 6, gx - 13, topY - 8);
  g.lineBetween(gx + 2, topY + 5, gx + 2, topY - 15);
  g.lineBetween(gx + 8, topY + 6, gx + 18, topY - 8);

  // =====================================================
  // PREMIUM CARROT BODY
  // =====================================================

  const carrotTop = gy - 18 + bob;
  const carrotBottom = gy + 34 + bob;

  // Shadow
  g.fillStyle(0x000000, 0.22);

  g.fillTriangle(
    gx - 16 + 3,
    carrotTop + 4,
    gx + 16 + 3,
    carrotTop + 4,
    gx + 3,
    carrotBottom + 5
  );

  // Main carrot
  g.fillStyle(0xe8761e, 1);

  g.fillTriangle(
    gx - 16,
    carrotTop,
    gx + 16,
    carrotTop,
    gx,
    carrotBottom
  );

  // Inner gradient illusion
  g.fillStyle(0xffb14f, 0.24);

  g.fillTriangle(
    gx - 6,
    carrotTop + 3,
    gx + 4,
    carrotTop + 3,
    gx - 1,
    carrotBottom - 10
  );

  // Dark edge shading
  g.fillStyle(0xb95a12, 0.18);

  g.fillTriangle(
    gx + 5,
    carrotTop,
    gx + 16,
    carrotTop,
    gx,
    carrotBottom
  );

  // =====================================================
  // CARROT TEXTURE LINES
  // =====================================================

  g.lineStyle(1.5, 0xc45f16, 0.45);

  for (let i = 0; i < 5; i++) {

    const yy = carrotTop + 8 + i * 7;

    const width = 10 - i;

    g.lineBetween(
      gx - width,
      yy,
      gx + width - 2,
      yy - 1
    );
  }

  // =====================================================
  // PREMIUM OUTLINE
  // =====================================================

  g.lineStyle(2, 0x7a3406, 0.65);

  g.strokeTriangle(
    gx - 16,
    carrotTop,
    gx + 16,
    carrotTop,
    gx,
    carrotBottom
  );

  // =====================================================
  // GLOSS / SHINE
  // =====================================================

  g.fillStyle(0xffffff, 0.20);

  g.fillEllipse(
    gx - 5,
    gy - 2 + bob,
    8,
    18
  );

  // =====================================================
  // PREMIUM GLOW RINGS
  // =====================================================

  g.lineStyle(4, 0xff912e, 0.25 + pulse * 0.22);

  g.strokeCircle(
    gx,
    gy + 4,
    34 + Math.sin(t) * 3
  );

  g.lineStyle(10, 0xff912e, 0.06 + pulse * 0.04);

  g.strokeCircle(
    gx,
    gy + 4,
    46 + Math.sin(t) * 3
  );

  // =====================================================
  // MAGIC PARTICLES
  // =====================================================

  g.fillStyle(0xffffff, 0.75);

  g.fillCircle(
    gx + 20,
    gy - 18 + Math.sin(t * 2) * 2,
    2
  );

  g.fillCircle(
    gx - 24,
    gy - 8 + Math.cos(t * 1.8) * 2,
    1.6
  );

  g.fillCircle(
    gx + 12,
    gy + 22 + Math.sin(t * 1.6),
    1.2
  );

  // =====================================================
  // CONTINUOUS REDRAW
  // =====================================================

  if (!this._goalTween) {

    this._goalTween = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.goalGfx) this._drawGoal();
      }
    });
  }
}

  _drawCollectibles() {
    const g = this.collectibleGfx;
    g.clear();
    (this.levelData.collectibles || []).forEach((c, i) => {
      if (c.collected) return;
      const cx = this._sx(c.x), cy = this._sy(c.y);
      const t   = this.time.now * 0.003 + i;
      const bob = Math.sin(t) * 3;

      // Acorn collectible
      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(cx + 1, cy + bob + 10, 14, 5);
      // Acorn body
      g.fillStyle(0xb86a10, 1);
      g.fillEllipse(cx, cy + bob, 16, 12);
      // Highlight on acorn body
      g.fillStyle(0xd4900a, 0.7);
      g.fillEllipse(cx - 2, cy + bob - 2, 9, 5);
      // Cap
      g.fillStyle(0x5a3010, 1);
      g.fillEllipse(cx, cy + bob - 7, 14, 7);
      // Cap texture dots
      g.fillStyle(0x3a1a00, 0.5);
      for (let d = 0; d < 3; d++) {
        g.fillCircle(cx - 4 + d*4, cy + bob - 7, 1.5);
      }
      // Stem
      g.lineStyle(1.5, 0x3a1a00, 1);
      g.lineBetween(cx, cy + bob - 10, cx + 2, cy + bob - 14);
      // Shine
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(cx - 3, cy + bob - 2, 5, 3);
    });
  }

  _initMovingObstacles() {
    this.movingObsData = (this.levelData.movingObstacles || []).map(m => ({
      ...m,
      cx: this._sx(m.x),
      cy: this._sy(m.y),
      range: this._sx(m.range),
      phase: Math.random() * Math.PI * 2,
    }));
  }

  _drawMovingObstacles(time) {
    const g = this.obstacleGfx;
    this.movingObsData.forEach(m => {
      const offset = Math.sin(time * 0.001 * m.speed + m.phase) * m.range;
      m.curX = m.cx + (m.axis === 'x' ? offset : 0);
      m.curY = m.cy + (m.axis === 'y' ? offset : 0);
      const mw = this._sx(m.w), mh = this._sy(m.h);

      // Worm obstacle — segmented body wiggling through dirt
      const segments = 5;
      const segW = mw / segments;
      for (let seg = 0; seg < segments; seg++) {
        const segX = m.curX - mw/2 + seg*segW + segW/2;
        const segY = m.curY + Math.sin(seg * 0.8 + time * 0.008) * 4;
        const col = seg % 2 === 0 ? 0xcc6644 : 0xaa4422;
        g.fillStyle(col, 1);
        g.fillCircle(segX, segY, segW * 0.6);
        // Segment ring
        g.lineStyle(0.8, 0x882200, 0.5);
        g.strokeCircle(segX, segY, segW * 0.6);
      }
      // Worm head
      const headX = m.axis === 'x'
        ? (offset > 0 ? m.curX + mw/2 : m.curX - mw/2)
        : m.curX;
      const headY = m.axis === 'y'
        ? (offset > 0 ? m.curY + mh/2 : m.curY - mh/2)
        : m.curY;
      g.fillStyle(0xff7744, 1);
      g.fillCircle(headX, headY, mh * 0.45);
      // Worm eyes
      g.fillStyle(0x111111, 1);
      g.fillCircle(headX - 2, headY - 2, 2);
      g.fillCircle(headX + 2, headY - 2, 2);
    });
  }

 _drawGates() {
  const g = this.gateGfx;
  g.clear();

  (this.levelData.gates || []).forEach(gate => {
    const open = this.gatesState[gate.id];

    const x = this._sx(gate.x);
    const y = this._sy(gate.y);
    const w = this._sx(gate.w);
    const h = this._sy(gate.h);

    const x0 = x - w / 2;
    const y0 = y - h / 2;

    if (open) {
      // OPEN GATE: ghost outline — iron frame impression only
      g.fillStyle(0x44ff88, 0.04);
      g.fillRoundedRect(x0, y0, w, h, 6);
      g.lineStyle(1.5, 0x44ff88, 0.22);
      g.strokeRoundedRect(x0, y0, w, h, 6);
      g.lineStyle(1, 0x44ff88, 0.10);
      g.strokeRoundedRect(x0 + 3, y0 + 3, w - 6, h - 6, 4);
      return;
    }

    // ===== CLOSED PREMIUM IRON PORTCULLIS GATE =====

    // Deep shadow
    g.fillStyle(0x000000, 0.30);
    g.fillRoundedRect(x0 + 4, y0 + 5, w, h, 6);

    // Outer iron frame
    g.fillStyle(0x2c2c2c, 1);
    g.fillRoundedRect(x0, y0, w, h, 6);

    // Frame inner cavity
    g.fillStyle(0x0a0a0a, 1);
    g.fillRoundedRect(x0 + 4, y0 + 4, w - 8, h - 8, 4);

    // Vertical iron bars
    const barCount = Math.max(2, Math.floor(w / 12));
    const barSpacing = (w - 8) / barCount;
    for (let i = 0; i < barCount; i++) {
      const bx = x0 + 4 + i * barSpacing + barSpacing / 2;
      g.fillStyle(0x000000, 0.4);
      g.fillRect(bx - 3 + 1, y0 + 4, 6, h - 8);
      g.fillGradientStyle(0x555555, 0x888888, 0x333333, 0x666666, 1);
      g.fillRect(bx - 3, y0 + 4, 6, h - 8);
      g.fillStyle(0xaaaaaa, 0.35);
      g.fillRect(bx - 3, y0 + 4, 2, h - 8);
      g.fillStyle(0x111111, 0.4);
      g.fillRect(bx + 1, y0 + 4, 2, h - 8);
      g.fillStyle(0x888888, 1);
      g.fillTriangle(bx - 3, y0 + h - 8, bx + 3, y0 + h - 8, bx, y0 + h - 3);
      g.fillStyle(0xbbbbbb, 0.4);
      g.fillTriangle(bx - 2, y0 + h - 8, bx, y0 + h - 8, bx - 1, y0 + h - 4);
    }

    // Horizontal crossbars
    const crossCount = Math.max(1, Math.floor(h / 18));
    for (let i = 0; i <= crossCount; i++) {
      const cy = y0 + 4 + (i * (h - 8)) / crossCount;
      g.fillStyle(0x000000, 0.35);
      g.fillRect(x0 + 4, cy - 2 + 1, w - 8, 5);
      g.fillGradientStyle(0x666666, 0x666666, 0x333333, 0x333333, 1);
      g.fillRect(x0 + 4, cy - 2, w - 8, 5);
      g.fillStyle(0xaaaaaa, 0.4);
      g.fillRect(x0 + 4, cy - 2, w - 8, 2);
    }

    // Corner rivets
    [[x0+7,y0+7],[x0+w-7,y0+7],[x0+7,y0+h-7],[x0+w-7,y0+h-7]].forEach(([rx,ry]) => {
      g.fillStyle(0x999999, 1); g.fillCircle(rx, ry, 3.5);
      g.fillStyle(0xcccccc, 0.5); g.fillCircle(rx-1, ry-1, 1.5);
      g.lineStyle(1, 0x222222, 0.7); g.strokeCircle(rx, ry, 3.5);
    });

    // Frame borders
    g.lineStyle(2.5, 0x111111, 1);
    g.strokeRoundedRect(x0, y0, w, h, 6);
    g.lineStyle(1, 0x888888, 0.18);
    g.strokeRoundedRect(x0 + 2, y0 + 2, w - 4, h - 4, 5);
  });
}
  _drawSwitches() {
    const g = this.switchGfx;
    g.clear();
    (this.levelData.switches || []).forEach(sw => {
      const x = this._sx(sw.x), y = this._sy(sw.y);
      const activated = sw.activated;

      // ── Panel base shadow ─────────────────────────────────
      g.fillStyle(0x000000, 0.30);
      g.fillRoundedRect(x - 16 + 2, y - 20 + 3, 32, 38, 6);

      // ── Panel body ────────────────────────────────────────
      const panelCol = activated ? 0x1a3a1a : 0x2a1a10;
      g.fillStyle(panelCol, 1);
      g.fillRoundedRect(x - 16, y - 20, 32, 38, 6);

      // Panel highlight top
      g.fillStyle(0xffffff, activated ? 0.10 : 0.07);
      g.fillRoundedRect(x - 14, y - 18, 28, 10, 4);

      // Panel outer border
      const borderCol = activated ? 0x44dd88 : 0xdd6622;
      g.lineStyle(2, borderCol, 0.85);
      g.strokeRoundedRect(x - 16, y - 20, 32, 38, 6);

      // Inner inset border
      g.lineStyle(1, borderCol, 0.20);
      g.strokeRoundedRect(x - 13, y - 17, 26, 32, 4);

      // ── Status indicator LED ──────────────────────────────
      const ledColor = activated ? 0x44ff88 : 0xff4422;
      g.fillStyle(ledColor, 1);
      g.fillCircle(x, y - 8, 5);
      // LED glow halo
      g.fillStyle(ledColor, 0.18);
      g.fillCircle(x, y - 8, 10);
      // LED glint
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(x - 1.5, y - 9.5, 1.5);

      // ── Lever arm ─────────────────────────────────────────
      const leverAngle = activated ? -0.5 : 0.5;
      const lx1 = x + Math.sin(leverAngle) * 0;
      const ly1 = y + 4;
      const lx2 = x + Math.sin(leverAngle) * 10;
      const ly2 = y + 4 - 14;

      // Lever shadow
      g.lineStyle(5, 0x000000, 0.25);
      g.lineBetween(lx1 + 1, ly1 + 1, lx2 + 1, ly2 + 1);

      // Lever body
      const leverColor = activated ? 0x66ffaa : 0xff8844;
      g.lineStyle(4, leverColor, 1);
      g.lineBetween(lx1, ly1, lx2, ly2);

      // Lever pivot base
      g.fillStyle(0x888888, 1);
      g.fillCircle(lx1, ly1, 4);
      g.fillStyle(0xcccccc, 0.6);
      g.fillCircle(lx1 - 1, ly1 - 1, 2);

      // Lever knob tip
      g.fillStyle(leverColor, 1);
      g.fillCircle(lx2, ly2, 4);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(lx2 - 1, ly2 - 1, 1.5);

      // ── Bottom label chip ─────────────────────────────────
      // (kept as text element — re-created each draw so remove old ones)
    });

    // Remove any stale labels, then re-add
    if (this._switchLabels) {
      this._switchLabels.forEach(t => t.destroy());
    }
    this._switchLabels = [];
    (this.levelData.switches || []).forEach(sw => {
      const x = this._sx(sw.x), y = this._sy(sw.y);
      const activated = sw.activated;
      const lbl = this.add.text(x, y + 24, activated ? "OPEN" : sw.id.toUpperCase(), {
        fontSize: "8px", fontStyle: "bold",
        color: activated ? "#66ffaa" : "#ff9966",
        stroke: "#000", strokeThickness: 2
      }).setOrigin(0.5).setDepth(9);
      this._switchLabels.push(lbl);
    });
  }

  _drawPlayer() {
    const g = this.playerGfx;
    g.clear();
    const lvl = this.levelData;
    const px = this.playerX !== undefined ? this.playerX : this._sx(lvl.start.x);
    const py = this.playerY !== undefined ? this.playerY : this._sy(lvl.start.y);
    this.playerX = px;
    this.playerY = py;
    this._drawRabbitAt(g, px, py, 1.0);
  }

_drawRabbitAt(g, x, y, scale, angle = 0) {

  // Smaller + cleaner sizing
  const s = scale * 0.92;

  g.save();
  g.translateCanvas(x, y);

  if (angle !== 0) g.rotateCanvas(angle);

  // =========================
  // Soft Ground Shadow
  // =========================
  g.fillStyle(0x000000, 0.20);
  g.fillEllipse(0, 24 * s, 46 * s, 12 * s);

  // =========================
  // Back Feet
  // =========================
  g.fillStyle(0xe7d7c8, 1);
  g.fillEllipse(-15 * s, 16 * s, 17 * s, 9 * s);
  g.fillEllipse(8 * s, 17 * s, 16 * s, 9 * s);

  // Feet fluff
  g.fillStyle(0xf8efe7, 0.9);
  g.fillEllipse(-15 * s, 17 * s, 10 * s, 4 * s);
  g.fillEllipse(8 * s, 18 * s, 9 * s, 4 * s);

  // =========================
  // Body
  // =========================
  g.fillStyle(0xc68b58, 1);
  g.fillEllipse(0, 2 * s, 44 * s, 32 * s);

  // Body highlight
  g.fillStyle(0xe2b68b, 0.35);
  g.fillEllipse(-5 * s, -3 * s, 26 * s, 14 * s);

  // Belly
  g.fillStyle(0xf5e4d3, 1);
  g.fillEllipse(2 * s, 6 * s, 22 * s, 18 * s);

  // =========================
  // Tail
  // =========================
  g.fillStyle(0xf7f2ec, 1);
  g.fillCircle(-23 * s, 5 * s, 5 * s);

  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(-24 * s, 4 * s, 1.5 * s);

  // =========================
  // Head
  // =========================
  g.fillStyle(0xc68b58, 1);
  g.fillCircle(15 * s, -9 * s, 15 * s);

  // Face highlight
  g.fillStyle(0xe8c19b, 0.35);
  g.fillCircle(11 * s, -12 * s, 8 * s);

  // Muzzle
  g.fillStyle(0xf5e4d3, 1);
  g.fillEllipse(20 * s, -3 * s, 15 * s, 11 * s);

  // =========================
  // Ears
  // =========================
  g.fillStyle(0xc68b58, 1);
  g.fillEllipse(6 * s, -32 * s, 10 * s, 28 * s);

  g.fillStyle(0xffc8d2, 1);
  g.fillEllipse(6 * s, -32 * s, 5 * s, 20 * s);

  g.fillStyle(0xb97c49, 1);
  g.fillEllipse(20 * s, -29 * s, 9 * s, 25 * s);

  g.fillStyle(0xffc8d2, 1);
  g.fillEllipse(20 * s, -29 * s, 4 * s, 18 * s);

  // Ear shine
  g.fillStyle(0xffffff, 0.10);
  g.fillEllipse(5 * s, -37 * s, 2 * s, 10 * s);

  // =========================
  // Eyes
  // =========================
  g.fillStyle(0x120b07, 1);
  g.fillEllipse(15 * s, -11 * s, 4.5 * s, 6 * s);

  // Eye shine
  g.fillStyle(0xffffff, 1);
  g.fillCircle(14 * s, -13 * s, 1 * s);

  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(16 * s, -10 * s, 0.6 * s);

  // =========================
  // Nose
  // =========================
  g.fillStyle(0xffa0b3, 1);

  g.fillTriangle(
    24 * s, -4 * s,
    28 * s, -2 * s,
    24 * s, 0 * s
  );

  // Mouth
  g.lineStyle(1 * s, 0x8b5a4a, 0.5);

  g.lineBetween(24 * s, 0, 23 * s, 3 * s);
  g.lineBetween(23 * s, 3 * s, 20 * s, 5 * s);
  g.lineBetween(23 * s, 3 * s, 26 * s, 5 * s);

  // =========================
  // Whiskers
  // =========================
  g.lineStyle(0.8 * s, 0xf5e8dc, 0.65);

  g.lineBetween(23 * s, -3 * s, 34 * s, -6 * s);
  g.lineBetween(23 * s, -1 * s, 35 * s, -1 * s);
  g.lineBetween(23 * s, 1 * s, 34 * s, 4 * s);

  // =========================
  // Front Paws
  // =========================
  g.fillStyle(0xd6a173, 1);

  g.fillEllipse(8 * s, 16 * s, 8 * s, 12 * s);
  g.fillEllipse(18 * s, 15 * s, 8 * s, 11 * s);

  // Paw highlights
  g.fillStyle(0xf5e4d3, 0.7);

  g.fillEllipse(8 * s, 17 * s, 4 * s, 4 * s);
  g.fillEllipse(18 * s, 16 * s, 4 * s, 4 * s);

  // =========================
  // Fur Details
  // =========================
  g.lineStyle(1 * s, 0xe8c19b, 0.22);

  g.lineBetween(-8 * s, -4 * s, -2 * s, -7 * s);
  g.lineBetween(-6 * s, 2 * s, 2 * s, 0 * s);
  g.lineBetween(-4 * s, 7 * s, 4 * s, 5 * s);

  // =========================
  // Premium Rim Light
  // =========================
  g.lineStyle(1.2 * s, 0xffffff, 0.06);
  g.strokeEllipse(0, 2 * s, 44 * s, 32 * s);

  g.restore();
}
  // ──────────────────────────────────────────────────────────────
_buildUI() {
  const w = this.W;
  const isMobile = w < 700;

  const topH    = isMobile ? 76 : 82;
  const sidePad = isMobile ? 10 : 16;
  const btnW    = isMobile ? 80 : 96;
  const btnH    = isMobile ? 26 : 28;
  const uiSize  = isMobile ? 10 : 12;
  const titleSize = isMobile ? 11 : 14;

  if (this.uiContainer) this.uiContainer.destroy(true);
  this.uiContainer = this.add.container(0, 0);
  this.uiContainer.setDepth(999);

  // ── Top bar ────────────────────────────────────────────────
  const panel = this.add.graphics();

  // Rich dark panel with subtle gradient
  panel.fillGradientStyle(0x1e0f06, 0x1e0f06, 0x0d0400, 0x0d0400, 1);
  panel.fillRect(0, 0, w, topH);

  // Very subtle inner noise texture bands
  panel.fillStyle(0xffffff, 0.015);
  for (let ty = 0; ty < topH; ty += 4) {
    panel.fillRect(0, ty, w, 2);
  }

  // Bottom separator — two-line premium chrome rule
  panel.lineStyle(1, 0x000000, 0.8);
  panel.lineBetween(0, topH, w, topH);
  panel.lineStyle(2, 0xe8a030, 0.75);
  panel.lineBetween(0, topH - 3, w, topH - 3);
  panel.lineStyle(1, 0xffd070, 0.18);
  panel.lineBetween(0, topH - 5, w, topH - 5);

  // Top rim highlight
  panel.lineStyle(1, 0xffffff, 0.04);
  panel.lineBetween(0, 0, w, 0);

  this.uiContainer.add(panel);

  // ── Level title ────────────────────────────────────────────
  // Background pill behind title
  const titlePill = this.add.graphics();
  const titleStr  = `LEVEL ${this.levelId}  ·  ${(this.levelData.name || "UNKNOWN").toUpperCase()}`;
  const titleW    = Math.min(w * 0.52, 260);
  titlePill.fillStyle(0x000000, 0.28);
  titlePill.fillRoundedRect(w / 2 - titleW / 2, 3, titleW, titleSize + 8, 6);
  titlePill.lineStyle(1, 0xe8a030, 0.35);
  // titlePill.strokeRoundedRect(w / 2 - titleW / 2, 3, titleW, titleSize + 8, 6);
  this.uiContainer.add(titlePill);

  const title = this.add.text(w / 2, 4 + (titleSize + 8) / 2,
    titleStr, {
      fontSize: `${titleSize}px`,
      fontStyle: "bold",
      color: "#ffe7b0",
      stroke: "#120800",
      strokeThickness: 3,
    }
  ).setOrigin(0.5, 0.5);
  this.uiContainer.add(title);

  // ── Row Y (buttons + bar) ──────────────────────────────────
  const rowY = isMobile ? 36 : 32;

  // ── MAP button ────────────────────────────────────────────
  const mapX = sidePad;
  const mapBg = this.add.graphics();
  // Shadow
  mapBg.fillStyle(0x000000, 0.35);
  mapBg.fillRoundedRect(mapX + 2, rowY + 2, btnW, btnH, 10);
  // Body gradient
  mapBg.fillGradientStyle(0x2a1c0c, 0x3a2410, 0x160c04, 0x221408, 1);
  mapBg.fillRoundedRect(mapX, rowY, btnW, btnH, 10);
  // Top shine
  mapBg.fillStyle(0xffffff, 0.07);
  mapBg.fillRoundedRect(mapX + 2, rowY + 2, btnW - 4, btnH * 0.45, 8);
  // Gold border
  mapBg.lineStyle(1.5, 0xe8a030, 0.90);
  mapBg.strokeRoundedRect(mapX, rowY, btnW, btnH, 10);
  mapBg.lineStyle(1, 0xffd070, 0.15);
  mapBg.strokeRoundedRect(mapX + 2, rowY + 2, btnW - 4, btnH - 4, 8);

  const mapBtn = this.add.text(mapX + btnW / 2, rowY + btnH / 2, "☰  MAP", {
    fontSize: `${uiSize}px`, fontStyle: "bold",
    color: "#ffd080", stroke: "#0a0400", strokeThickness: 3,
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  mapBtn.on("pointerover",  () => { mapBg.setAlpha(1.15); mapBtn.setColor("#ffffff"); });
  mapBtn.on("pointerout",   () => { mapBg.setAlpha(1);    mapBtn.setColor("#ffd080"); });
  mapBtn.on("pointerdown",  () => { this.scene.start("LevelSelectScene"); });
  this.uiContainer.add([mapBg, mapBtn]);

  // ── RETRY button ───────────────────────────────────────────
  const retryX = w - btnW - sidePad;
  const retryBg = this.add.graphics();
  retryBg.fillStyle(0x000000, 0.35);
  retryBg.fillRoundedRect(retryX + 2, rowY + 2, btnW, btnH, 10);
  retryBg.fillGradientStyle(0x3a1008, 0x4a1a0c, 0x1e0804, 0x2a1008, 1);
  retryBg.fillRoundedRect(retryX, rowY, btnW, btnH, 10);
  retryBg.fillStyle(0xffffff, 0.07);
  retryBg.fillRoundedRect(retryX + 2, rowY + 2, btnW - 4, btnH * 0.45, 8);
  retryBg.lineStyle(1.5, 0xff7040, 0.85);
  retryBg.strokeRoundedRect(retryX, rowY, btnW, btnH, 10);
  retryBg.lineStyle(1, 0xffb080, 0.15);
  retryBg.strokeRoundedRect(retryX + 2, rowY + 2, btnW - 4, btnH - 4, 8);

  const retryBtn = this.add.text(retryX + btnW / 2, rowY + btnH / 2, "↺  RETRY", {
    fontSize: `${uiSize}px`, fontStyle: "bold",
    color: "#ffb898", stroke: "#0a0200", strokeThickness: 3,
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  retryBtn.on("pointerover",  () => { retryBg.setAlpha(1.15); retryBtn.setColor("#ffffff"); });
  retryBtn.on("pointerout",   () => { retryBg.setAlpha(1);    retryBtn.setColor("#ffb898"); });
  retryBtn.on("pointerdown",  () => { this.scene.restart({ levelId: this.levelId }); });
  this.uiContainer.add([retryBg, retryBtn]);

  // ── DIG bar ───────────────────────────────────────────────
  const gap  = isMobile ? 6 : 10;
  const barX = mapX + btnW + gap;
  const barW = w - (sidePad * 2) - (btnW * 2) - (gap * 2);
  const barH = isMobile ? 16 : 18;
  const barY = rowY + (btnH / 2) - (barH / 2);

  this._barW = barW - 6;

  const barBg = this.add.graphics();
  // Bar track — deep inset look
  barBg.fillStyle(0x000000, 0.50);
  barBg.fillRoundedRect(barX, barY, barW, barH, barH / 2);
  barBg.fillStyle(0x080401, 1);
  barBg.fillRoundedRect(barX + 1, barY + 1, barW - 2, barH - 2, barH / 2 - 1);
  // Gold border
  barBg.lineStyle(1.5, 0xd4922a, 0.9);
  barBg.strokeRoundedRect(barX, barY, barW, barH, barH / 2);

  // Dig label
  const digLbl = this.add.text(barX - 2, barY + barH / 2, "⛏", {
    fontSize: `${uiSize + 1}px`,
  }).setOrigin(1, 0.5);
  this.uiContainer.add(digLbl);

  this.paintBar = this.add.rectangle(
    barX + 3, barY + barH / 2,
    this._barW, barH - 6,
    0xe89a1c
  ).setOrigin(0, 0.5);
  // Rounded mask via a custom drawn fill
  this.paintText = this.add.text(barX + barW / 2, barY + barH / 2, "100%", {
    fontSize: `${uiSize}px`, fontStyle: "bold",
    color: "#ffffff", stroke: "#000", strokeThickness: 3,
  }).setOrigin(0.5);

  // Shine overlay on bar
  const barShine = this.add.graphics();
  barShine.fillStyle(0xffffff, 0.07);
  barShine.fillRoundedRect(barX + 1, barY + 1, barW - 2, (barH - 2) * 0.45, barH / 2 - 1);

  this.uiContainer.add([barBg, this.paintBar, this.paintText, barShine]);

  // ── Acorn / coin counter ──────────────────────────────────
  const total = (this.levelData.collectibles || []).length;
  const coinPillW = isMobile ? 56 : 66;
  const coinPillH = isMobile ? 16 : 18;
  const coinPillX = w - coinPillW - sidePad;
  const coinPillY = 5;

  const coinBg = this.add.graphics();
  coinBg.fillStyle(0x000000, 0.35);
  coinBg.fillRoundedRect(coinPillX + 1, coinPillY + 2, coinPillW, coinPillH, coinPillH / 2);
  coinBg.fillGradientStyle(0x2a1a06, 0x2a1a06, 0x120a02, 0x120a02, 1);
  coinBg.fillRoundedRect(coinPillX, coinPillY, coinPillW, coinPillH, coinPillH / 2);
  coinBg.lineStyle(1.5, 0xe8c040, 0.70);
  coinBg.strokeRoundedRect(coinPillX, coinPillY, coinPillW, coinPillH, coinPillH / 2);
  this.uiContainer.add(coinBg);

  this.coinCounter = this.add.text(
    coinPillX + coinPillW / 2, coinPillY + coinPillH / 2,
    `🌰 ${this.coinsCollected || 0}/${total}`, {
      fontSize: `${uiSize}px`, fontStyle: "bold",
      color: "#ffe880", stroke: "#120800", strokeThickness: 3,
    }
  ).setOrigin(0.5);
  this.uiContainer.add(this.coinCounter);
}

_updateUI() {
  const max = this.paintMax;
  const used = this.paintUsed;

  const pct = Phaser.Math.Clamp(
    1 - used / max,
    0,
    1
  );

  // Width
  this.paintBar.width =
    this._barW * pct;

  // Color states
  if (pct > 0.6) {
    this.paintBar.setFillStyle(0xdd8a16);
  }
  else if (pct > 0.3) {
    this.paintBar.setFillStyle(0xe36414);
  }
  else {
    this.paintBar.setFillStyle(0xd32f2f);
  }

  // Text
  this.paintText.setText(
    `${Math.floor(pct * 100)}%`
  );

  // Coins
  const total =
    (this.levelData.collectibles || []).length;

  this.coinCounter.setText(
    `🌰 ${this.coinsCollected}/${total}`
  );
}

  _updateUI() {
    const max  = this.paintMax;
    const used = this.paintUsed;
    const pct  = Math.max(0, 1 - used / max);
    const bw   = this._barW;

    this.paintBar.width = bw * pct;
    this.paintBar.setFillStyle(
      pct > 0.5 ? 0xd4780a : pct > 0.25 ? 0xcc6600 : 0xcc3300
    );
    this.paintText.setText(`${Math.floor(pct * 100)}%`);

    const total = (this.levelData.collectibles || []).length;
    this.coinCounter.setText(`🌰 ${this.coinsCollected}/${total}`);
  }

  // ──────────────────────────────────────────────────────────────
  _onDown(ptr) {
    if (this.state !== STATE.DRAWING) return;
    const sx = this._sx(this.levelData.start.x);
    const sy = this._sy(this.levelData.start.y);
    if (Phaser.Math.Distance.Between(ptr.x, ptr.y, sx, sy) > 60) return;

    this.isDrawing   = true;
    this.drawnPoints = [{ x: ptr.x, y: ptr.y }];
    this.paintUsed   = 0;
    this.pathGfx.clear();
    SoundManager.play('draw');
  }

  _onMove(ptr) {
    if (!this.isDrawing || this.state !== STATE.DRAWING) return;
    const last = this.drawnPoints[this.drawnPoints.length - 1];
    const dist = Phaser.Math.Distance.Between(ptr.x, ptr.y, last.x, last.y);
    if (dist < 6) return;

    let paintCost = dist;
    const lvl = this.levelData;
    (lvl.costZones || []).forEach(zone => {
      const zx = this._sx(zone.x) - this._sx(zone.w)/2;
      const zy = this._sy(zone.y) - this._sy(zone.h)/2;
      const zw = this._sx(zone.w), zh = this._sy(zone.h);
      if (ptr.x >= zx && ptr.x <= zx+zw && ptr.y >= zy && ptr.y <= zy+zh) {
        paintCost = dist * zone.cost;
      }
    });

    if (this.paintUsed + paintCost > this.paintMax) {
      SoundManager.play('outOfPaint');
      this._onUp(ptr);
      return;
    }

    this.paintUsed += paintCost;
    this.drawnPoints.push({ x: ptr.x, y: ptr.y });

    // Scrape sound every ~30 px of drawn path
    if (!this._lastDrawSnd) this._lastDrawSnd = 0;
    this._lastDrawSnd += dist;
    if (this._lastDrawSnd > 30) { this._lastDrawSnd = 0; SoundManager.play('draw'); }

    this._redrawPath();
    this._updateUI();
  }

  _onUp(ptr) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.drawnPoints.length < 3) return;
    this.state     = STATE.RUNNING;
    this.pathIndex = 0;
    this.pathT     = 0;
    this.playerX   = this.drawnPoints[0].x;
    this.playerY   = this.drawnPoints[0].y;
    if (this.hintText) this.hintText.setAlpha(0);
    SoundManager.play('run');
  }

  _redrawPath() {
    const g   = this.pathGfx;
    const pts = this.drawnPoints;
    g.clear();

    // Dirt tunnel path — earthy brown/amber dig trail
    // Outer shadow
    g.lineStyle(10, 0x000000, 0.2);
    g.beginPath();
    g.moveTo(pts[0].x + 2, pts[0].y + 2);
    pts.slice(1).forEach(p => g.lineTo(p.x + 2, p.y + 2));
    g.strokePath();

    // Main dirt channel (darker earth)
    g.lineStyle(8, 0x5a3010, 0.85);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => g.lineTo(p.x, p.y));
    g.strokePath();

    // Inner lighter dirt
    g.lineStyle(4, 0xd4780a, 0.75);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => g.lineTo(p.x, p.y));
    g.strokePath();

    // Warm glow center
    g.lineStyle(1.5, 0xf0c060, 0.5);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y - 1);
    pts.slice(1).forEach(p => g.lineTo(p.x, p.y - 1));
    g.strokePath();

    // Start dot — glowing burrow entrance
    g.fillStyle(0xd4780a, 1);
    g.fillCircle(pts[0].x, pts[0].y, 7);
    g.lineStyle(2, 0xf0c060, 0.6);
    g.strokeCircle(pts[0].x, pts[0].y, 7);

    // Arrowhead at end (claw marks direction)
    if (pts.length > 1) {
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      g.fillStyle(0xd4780a, 0.9);
      g.fillTriangle(
        last.x + Math.cos(angle)*12, last.y + Math.sin(angle)*12,
        last.x + Math.cos(angle + 2.4)*8, last.y + Math.sin(angle + 2.4)*8,
        last.x + Math.cos(angle - 2.4)*8, last.y + Math.sin(angle - 2.4)*8
      );
    }
  }

  // ──────────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.state !== STATE.WIN) this._drawCollectibles();

    this.obstacleGfx.clear();
    this._drawObstacles();
    this._drawMovingObstacles(time);

    if (this.state === STATE.RUNNING) {
      this._stepCharacter(delta);
      this._checkCollisions();
      this._checkCollectibles();
      this._checkSwitches();
    }

    if (this.state === STATE.DRAWING) {
      const sx = this._sx(this.levelData.start.x);
      const sy = this._sy(this.levelData.start.y);
      this.playerGfx.clear();
      this._drawRabbitAt(this.playerGfx, sx, sy, 1.0);
      // Pulsing claw-scratch start ring
      const pulse = 0.4 + Math.sin(time * 0.005) * 0.3;
      this.playerGfx.lineStyle(3, 0xd4780a, pulse);
      this.playerGfx.strokeCircle(sx, sy, 28 + Math.sin(time*0.005)*4);
      // Dirt mote effect at start position
      this.playerGfx.fillStyle(0xd4780a, pulse * 0.3);
      this.playerGfx.fillCircle(sx, sy, 34 + Math.sin(time*0.004)*5);
    }
  }

  _stepCharacter(delta) {
    const pts   = this.drawnPoints;
    const speed = 180;

    if (this.pathIndex >= pts.length - 1) {
      this._checkGoal();
      return;
    }

    const target = pts[this.pathIndex + 1];
    const dx = target.x - this.playerX;
    const dy = target.y - this.playerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const step = speed * (delta / 1000);

    if (step >= dist) {
      this.playerX = target.x;
      this.playerY = target.y;
      this.pathIndex++;
    } else {
      const ratio = step / dist;
      this.playerX += dx * ratio;
      this.playerY += dy * ratio;
    }

    const angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    this.playerGfx.clear();
    this._drawRabbitAt(this.playerGfx, this.playerX, this.playerY, 1.0, angle * 0.3);

    
  }

  _checkCollisions() {
    const px = this.playerX, py = this.playerY;
    const pr = 16;
    const lvl = this.levelData;

    const hit = (obs) => {
      const ox = this._sx(obs.x) - this._sx(obs.w)/2;
      const oy = this._sy(obs.y) - this._sy(obs.h)/2;
      const ow = this._sx(obs.w), oh = this._sy(obs.h);
      return px+pr > ox && px-pr < ox+ow && py+pr > oy && py-pr < oy+oh;
    };

    for (const obs of (lvl.obstacles || [])) {
      if (hit(obs)) { this._die(); return; }
    }

    for (const m of this.movingObsData) {
      const mw = this._sx(m.w)/2, mh = this._sy(m.h)/2;
      if (px+pr > m.curX-mw && px-pr < m.curX+mw &&
          py+pr > m.curY-mh && py-pr < m.curY+mh) {
        this._die(); return;
      }
    }

    for (const gate of (lvl.gates || [])) {
      if (this.gatesState[gate.id]) continue;
      const gx = this._sx(gate.x) - this._sx(gate.w)/2;
      const gy = this._sy(gate.y) - this._sy(gate.h)/2;
      const gw = this._sx(gate.w), gh = this._sy(gate.h);
      if (px+pr > gx && px-pr < gx+gw && py+pr > gy && py-pr < gy+gh) {
        this._die(); return;
      }
    }
  }

  _checkCollectibles() {
    const px = this.playerX, py = this.playerY;
    (this.levelData.collectibles || []).forEach(c => {
      if (c.collected) return;
      const cx = this._sx(c.x), cy = this._sy(c.y);
      if (Phaser.Math.Distance.Between(px, py, cx, cy) < 24) {
        c.collected = true;
        this.coinsCollected++;
        this._updateUI();
        this._collectFX(cx, cy);
      }
    });
  }

  _checkSwitches() {
    const px = this.playerX, py = this.playerY;
    (this.levelData.switches || []).forEach(sw => {
      if (sw.activated) return;
      const sx = this._sx(sw.x), sy = this._sy(sw.y);
      if (Phaser.Math.Distance.Between(px, py, sx, sy) < 20) {
        sw.activated = true;
        this.gatesState[sw.id] = true;
        this._drawGates();
        this._drawSwitches();
        this._gateFX(sw.id);
      }
    });
  }

  _checkGoal() {
    if (this.state === STATE.WIN || this.state === STATE.DEAD) return;
    const gx = this._sx(this.levelData.goal.x);
    const gy = this._sy(this.levelData.goal.y);
    if (Phaser.Math.Distance.Between(this.playerX, this.playerY, gx, gy) < 36) {
      this._win();
    } else {
      this.state = STATE.DRAWING;
      this._showMessage("Path didn't reach the carrot!\nDig again 🐾", "#f9f9f9");
    }
  }

  async _win() {
    if (this.state === STATE.WIN) return;
    this.state = STATE.WIN;
    SoundManager.play('win');

    const total   = (this.levelData.collectibles || []).length;
    const paintPct = 1 - this.paintUsed / this.paintMax;
    let stars = 1;
    if (this.coinsCollected >= Math.ceil(total / 2)) stars = 2;
    if (this.coinsCollected === total && paintPct >= 0.2) stars = 3;

    await SaveManager.setStars(this.levelId, stars);
    YT.sendScore(SaveManager.getTotalStars());
    this._winParticles();

    this.time.delayedCall(600, () => {
      this.scene.start("WinScene", {
        levelId: this.levelId,
        stars,
        coinsCollected: this.coinsCollected,
        totalCoins: total,
        paintUsed: Math.floor(this.paintUsed),
        paintMax: Math.round(this.paintMax),
        hasNext: this.levelId < 20,
      });
    });
  }

  _die() {
    if (this.state === STATE.DEAD || this.state === STATE.WIN) return;
    this.state = STATE.DEAD;
    SoundManager.play('die');
    this.cameras.main.shake(280, 0.014);

    // Earth-tone death flash
    const flash = this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0x5a1a00, 0.45).setDepth(50);
    this.tweens.add({ targets: flash, alpha:0, duration:320, onComplete: () => flash.destroy() });

    this._showMessage("💥 Blocked by the underground!\nDig a new path 🐾", "#e8a060");

    this.time.delayedCall(1200, () => {
      this.state = STATE.DRAWING;
      this.drawnPoints = [];
      this.paintUsed = 0;
      this.pathGfx.clear();
      this.playerX = this._sx(this.levelData.start.x);
      this.playerY = this._sy(this.levelData.start.y);
      (this.levelData.collectibles || []).forEach(c => c.collected = false);
      this.coinsCollected = 0;
      (this.levelData.switches || []).forEach(sw => sw.activated = false);
      (this.levelData.gates || []).forEach(g => {
        this.gatesState[g.id] = g.open;
      });
      this._drawGates();
      this._drawSwitches();
      this._updateUI();
    });
  }

  _collectFX(x, y) {
    SoundManager.play('collect');
    // Premium gold flash ring
    const ring = this.add.graphics().setDepth(15);
    ring.lineStyle(3, 0xffd060, 0.9);
    ring.strokeCircle(x, y, 6);
    this.tweens.add({
      targets: ring, scaleX: 3.5, scaleY: 3.5, alpha: 0,
      duration: 420, ease: "Power2",
      onComplete: () => ring.destroy()
    });
    // Premium "+ACORN" floating label
    const label = this.add.text(x, y - 18, "+ACORN", {
      fontSize: "13px", fontStyle: "bold", color: "#ffe880",
      stroke: "#4a2800", strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 2, color: "#000", blur: 4, fill: true }
    }).setOrigin(0.5).setDepth(16);
    this.tweens.add({
      targets: label, y: y - 52, alpha: 0,
      duration: 750, ease: "Power2",
      onComplete: () => label.destroy()
    });
  }

  _gateFX(id) {
    SoundManager.play('gate');
    const gate = (this.levelData.gates||[]).find(g => g.id === id);
    if (!gate) return;
    const gx = this._sx(gate.x), gy = this._sy(gate.y);
    const ring = this.add.circle(gx, gy, 10, 0xd4780a).setDepth(15);
    this.tweens.add({
      targets:ring, scaleX:4, scaleY:4, alpha:0,
      duration:500, onComplete: () => ring.destroy()
    });
    this._showMessage("Wooden gate crumbled!", "#d4780a", 1200);
  }

  _winParticles() {
    // Premium win flash — no floating circles, just a radial glow burst
    const w = this.W, h = this.H;
    const flash = this.add.graphics().setDepth(30);
    flash.fillStyle(0xffd060, 0.22);
    flash.fillCircle(w / 2, h / 2, Math.max(w, h) * 0.8);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 600, ease: "Power3",
      onComplete: () => flash.destroy()
    });
    // Elegant concentric ring burst
    for (let i = 0; i < 3; i++) {
      const ring = this.add.graphics().setDepth(30);
      ring.lineStyle(4 - i, 0xffd060, 0.7 - i * 0.2);
      ring.strokeCircle(w / 2, h / 2, 40 + i * 20);
      this.tweens.add({
        targets: ring, scaleX: 5, scaleY: 5, alpha: 0,
        duration: 700 + i * 120, delay: i * 80, ease: "Power2",
        onComplete: () => ring.destroy()
      });
    }
  }


 _showMessage(msg, color = "#e8c87a", duration = 2500) {
  const w = this.W;
  const h = this.H;
  const isMobile = w < 700;

  // destroy old message if exists
  if (this._msgUI) {
    this._msgUI.destroy(true);
  }

  const container = this.add.container(w / 2, h * 0.28);
  container.setDepth(9999);
  container.alpha = 0;
  container.setScale(0.85);
  this._msgUI = container;

  // =====================================================
  // RESPONSIVE LIMITS
  // =====================================================
  const maxWidth = w * (isMobile ? 0.85 : 0.55);
  const padX = isMobile ? 14 : 20;
  const padY = isMobile ? 10 : 14;

  // =====================================================
  // TEXT (AUTO WRAP)
  // =====================================================
  const txt = this.add.text(0, 0, msg, {
    fontSize: isMobile ? "13px" : "16px",
    fontStyle: "bold",
    color: color,
    align: "center",
    wordWrap: { width: maxWidth },
    stroke: "#000",
    strokeThickness: 4
  }).setOrigin(0.5);

  // =====================================================
  // BACKGROUND SIZE BASED ON TEXT
  // =====================================================
  const bgW = txt.width + padX * 2;
  const bgH = txt.height + padY * 2;

  const bg = this.add.graphics();

  // shadow depth
  bg.fillStyle(0x000000, 0.35);
  bg.fillRoundedRect(
    -bgW / 2,
    -bgH / 2 + 4,
    bgW,
    bgH,
    16
  );

  // main glass panel
  bg.fillGradientStyle(
    0x1a0d05,
    0x2a1408,
    0x120700,
    0x120700,
    1
  );

  bg.fillRoundedRect(
    -bgW / 2,
    -bgH / 2,
    bgW,
    bgH,
    16
  );

  // premium border glow
  bg.lineStyle(2, 0xffc27a, 0.65);
  bg.strokeRoundedRect(
    -bgW / 2,
    -bgH / 2,
    bgW,
    bgH,
    16
  );

  // glossy top highlight
  bg.fillStyle(0xffffff, 0.06);
  bg.fillRoundedRect(
    -bgW / 2 + 4,
    -bgH / 2 + 4,
    bgW - 8,
    bgH / 2,
    14
  );

  container.add([bg, txt]);

  // =====================================================
  // POP-IN ANIMATION (AAA FEEL)
  // =====================================================
  this.tweens.add({
    targets: container,
    alpha: 1,
    scale: 1,
    duration: 180,
    ease: "Back.Out"
  });

  // slight float up
  this.tweens.add({
    targets: container,
    y: container.y - 6,
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut"
  });

  // =====================================================
  // AUTO EXIT
  // =====================================================
  this.time.delayedCall(duration, () => {
    this.tweens.add({
      targets: container,
      alpha: 0,
      scale: 0.9,
      duration: 250,
      ease: "Power2",
      onComplete: () => container.destroy()
    });
  });
}
}