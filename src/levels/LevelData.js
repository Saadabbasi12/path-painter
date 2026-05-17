/**
 * Level definitions for Path Painter.
 * All positions are in a normalized 0-1 coordinate space
 * and scaled to actual screen size at runtime.
 *
 * COORDINATE SYSTEM (as used by GameScene):
 *   - x, y = CENTER of the obstacle/zone
 *   - w, h = total width/height
 *   - Collision rect: [x - w/2 .. x + w/2] × [y - h/2 .. y + h/2]
 *   - Playfield roughly 0.05–0.95 (x) and 0.12–0.92 (y) after UI bars
 *
 * DESIGN RULES applied:
 *   1. Every level has at least one clear passable route.
 *   2. Obstacles never seal the entire vertical/horizontal span.
 *   3. Moving obstacles stay fully on-screen at all extremes
 *      (center ± range must stay within 0.08–0.92).
 *   4. Switches are placed BEFORE their gate on the natural path.
 *   5. Gates block a choke-point; the switch detours the player.
 *   6. Cost zones cover only part of the corridor, not all of it.
 *   7. Collectibles are placed in open space, not inside obstacles.
 *   8. Paint budgets are tuned so the optimal route costs ~70-80 %
 *      of the budget, leaving some slack for imperfect drawings.
 *
 * Types:
 *  obstacles      : { x, y, w, h, type: 'wall'|'spike'|'water' }
 *  collectibles   : { x, y }
 *  movingObstacles: { x, y, w, h, axis:'x'|'y', range, speed }
 *  switches       : { x, y, id }
 *  gates          : { x, y, w, h, id, open:bool }
 *  costZones      : { x, y, w, h, cost }
 *  start          : { x, y }
 *  goal           : { x, y }
 *  paint          : total paint units available
 */

const LEVELS = [

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 1–5 · Basic obstacles only — learn to route around walls
  // ═══════════════════════════════════════════════════════════════

  {
    // Dead-straight open corridor. Just get to the goal.
    id: 1, name: "First Steps",
    paint: 400, bg: 0x87ceeb,
    start: { x: 0.1,  y: 0.55 },
    goal:  { x: 0.9,  y: 0.55 },
    obstacles: [],
    collectibles: [
      { x: 0.3, y: 0.55 },
      { x: 0.5, y: 0.55 },
      { x: 0.7, y: 0.55 },
    ],
    movingObstacles: [], switches: [], gates: [], costZones: [],
  },

  {
    // One tall wall in the centre — player must go over or under.
    // Wall spans y 0.30–0.62, so clear passages above (y<0.28) and below (y>0.64).
    id: 2, name: "Step Over",
    paint: 380, bg: 0x98d8c8,
    start: { x: 0.1,  y: 0.55 },
    goal:  { x: 0.9,  y: 0.55 },
    obstacles: [
      // center x=0.45, spans [0.425, 0.475]; center y=0.46, spans [0.30, 0.62]
      { x: 0.45, y: 0.46, w: 0.05, h: 0.32, type: 'wall' },
    ],
    collectibles: [
      { x: 0.28, y: 0.55 },   // before wall, mid
      { x: 0.55, y: 0.26 },   // above wall gap
      { x: 0.72, y: 0.55 },   // after wall, mid
    ],
    movingObstacles: [], switches: [], gates: [], costZones: [],
  },

  {
    // Two staggered walls — classic zigzag route.
    // Wall A: x=0.32, y=0.40, spans y [0.26, 0.54] — blocks mid; gap above y<0.24 and below y>0.56.
    // Wall B: x=0.58, y=0.56, spans y [0.42, 0.70] — blocks mid-low; gap above y<0.40.
    id: 3, name: "Zigzag",
    paint: 440, bg: 0xb8e0d2,
    start: { x: 0.1,  y: 0.65 },
    goal:  { x: 0.9,  y: 0.35 },
    obstacles: [
      { x: 0.32, y: 0.40, w: 0.05, h: 0.28, type: 'wall' },
      { x: 0.58, y: 0.58, w: 0.05, h: 0.28, type: 'wall' },
    ],
    collectibles: [
      { x: 0.20, y: 0.65 },   // start corridor
      { x: 0.42, y: 0.24 },   // above wall A
      { x: 0.70, y: 0.38 },   // above wall B
      { x: 0.82, y: 0.35 },   // near goal
    ],
    movingObstacles: [], switches: [], gates: [], costZones: [],
  },

  {
    // Two water pits on the direct path — route must arc above both.
    // Pits are 0.10 wide centred at x=0.35 and x=0.65, y=0.70.
    // Direct path y=0.70 is blocked; arc through y≈0.45 is safe.
    id: 4, name: "The Gap",
    paint: 400, bg: 0xf0e6b3,
    start: { x: 0.08, y: 0.70 },
    goal:  { x: 0.92, y: 0.70 },
    obstacles: [
      { x: 0.35, y: 0.72, w: 0.12, h: 0.06, type: 'water' },
      { x: 0.65, y: 0.72, w: 0.12, h: 0.06, type: 'water' },
    ],
    collectibles: [
      { x: 0.20, y: 0.70 },
      { x: 0.35, y: 0.44 },   // above pit A reward
      { x: 0.65, y: 0.44 },   // above pit B reward
      { x: 0.80, y: 0.70 },
    ],
    movingObstacles: [], switches: [], gates: [], costZones: [],
  },

  {
    // Proper U-shaped maze with ONE exit — player must navigate.
    // Horizontal shelf seals y=0.62 from x=0.25 to x=0.70.
    // Left wall x=0.25 seals [0.30, 0.62] vertically.
    // Right wall x=0.70 seals [0.30, 0.62] vertically.
    // Gap: above y<0.28 between x=0.25 and x=0.70 is open;
    //       right side of right wall x>0.72 is open at all y.
    id: 5, name: "Maze Start",
    paint: 480, bg: 0xd4b8e0,
    start: { x: 0.08, y: 0.50 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [
      // Left vertical wall
      { x: 0.25, y: 0.46, w: 0.04, h: 0.32, type: 'wall' },
      // Bottom horizontal shelf (seals bottom of U)
      { x: 0.47, y: 0.62, w: 0.46, h: 0.04, type: 'wall' },
      // Right vertical wall
      { x: 0.70, y: 0.46, w: 0.04, h: 0.32, type: 'wall' },
    ],
    collectibles: [
      { x: 0.15, y: 0.50 },
      { x: 0.47, y: 0.26 },   // reward for going up and over
      { x: 0.82, y: 0.50 },
      { x: 0.47, y: 0.50 },   // inside the U — tricky detour
    ],
    movingObstacles: [], switches: [], gates: [], costZones: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 6–10 · Moving obstacles — timing and avoidance
  // ═══════════════════════════════════════════════════════════════

  {
    // Single vertical patrol in the middle corridor.
    // Mover: centre x=0.50, y=0.50, range=0.22 on y-axis → sweeps [0.28, 0.72].
    // Safe passage: draw path early (before mover swings down) or hug the edge.
    id: 6, name: "Dodge It",
    paint: 420, bg: 0xffd6a5,
    start: { x: 0.08, y: 0.50 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [],
    collectibles: [
      { x: 0.22, y: 0.50 },
      { x: 0.50, y: 0.28 },   // near top — safe when mover is low
      { x: 0.78, y: 0.50 },
    ],
    movingObstacles: [
      // worm sweeps full corridor vertically; w/h sized as worm body
      { x: 0.50, y: 0.50, w: 0.06, h: 0.10, axis: 'y', range: 0.22, speed: 1.2 },
    ],
    switches: [], gates: [], costZones: [],
  },

  {
    // One wall + horizontal patrol on opposite side.
    // Wall left at x=0.30, leaving right corridor clear.
    // Mover patrols x-axis at y=0.38; range 0.14 → sweeps [0.56, 0.84].
    id: 7, name: "Swing Low",
    paint: 440, bg: 0xc9e4ca,
    start: { x: 0.08, y: 0.65 },
    goal:  { x: 0.92, y: 0.38 },
    obstacles: [
      // Wall blocks centre-left
      { x: 0.30, y: 0.45, w: 0.04, h: 0.26, type: 'wall' },
    ],
    collectibles: [
      { x: 0.18, y: 0.65 },
      { x: 0.42, y: 0.65 },   // low path, easy to grab
      { x: 0.42, y: 0.28 },   // high path reward
      { x: 0.78, y: 0.38 },
    ],
    movingObstacles: [
      // horizontal patrol in upper right area
      { x: 0.70, y: 0.38, w: 0.06, h: 0.10, axis: 'x', range: 0.14, speed: 1.5 },
    ],
    switches: [], gates: [], costZones: [],
  },

  {
    // Two vertical patrols at different phases — crossfire.
    // No static walls; both movers fill the vertical span but at different x.
    // Route above or below both patrols, timed.
    id: 8, name: "Crossfire",
    paint: 420, bg: 0xffe5d9,
    start: { x: 0.08, y: 0.50 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [],
    collectibles: [
      { x: 0.22, y: 0.30 },
      { x: 0.50, y: 0.72 },
      { x: 0.78, y: 0.30 },
    ],
    movingObstacles: [
      { x: 0.36, y: 0.50, w: 0.06, h: 0.10, axis: 'y', range: 0.22, speed: 1.6 },
      { x: 0.64, y: 0.50, w: 0.06, h: 0.10, axis: 'y', range: 0.22, speed: 2.0 },
    ],
    switches: [], gates: [], costZones: [],
  },

  {
    // Horizontal tunnel (walls top and bottom) with one fast horizontal patrol.
    // Tunnel walls leave y corridor [0.38, 0.62].
    // Mover patrols x inside tunnel; centre x=0.50, range 0.22 → [0.28, 0.72].
    id: 9, name: "Rush Hour",
    paint: 400, bg: 0xd0f0c0,
    start: { x: 0.08, y: 0.50 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [
      // Ceiling wall
      { x: 0.50, y: 0.30, w: 0.70, h: 0.04, type: 'wall' },
      // Floor wall
      { x: 0.50, y: 0.70, w: 0.70, h: 0.04, type: 'wall' },
    ],
    collectibles: [
      { x: 0.22, y: 0.50 },
      { x: 0.50, y: 0.42 },   // inside tunnel, upper half
      { x: 0.50, y: 0.58 },   // inside tunnel, lower half
      { x: 0.78, y: 0.50 },
    ],
    movingObstacles: [
      { x: 0.50, y: 0.50, w: 0.06, h: 0.10, axis: 'x', range: 0.22, speed: 2.2 },
    ],
    switches: [], gates: [], costZones: [],
  },

  {
    // Two walls creating a narrow S-channel; two movers of different axes.
    // Wall A: x=0.28, spans y [0.28, 0.56] — blocks left-mid from above.
    // Wall B: x=0.62, spans y [0.44, 0.72] — blocks right-mid from below.
    // Route: go low-left, squeeze between walls, go high-right.
    id: 10, name: "The Gauntlet",
    paint: 460, bg: 0xfce4ec,
    start: { x: 0.08, y: 0.65 },
    goal:  { x: 0.92, y: 0.35 },
    obstacles: [
      { x: 0.28, y: 0.42, w: 0.05, h: 0.28, type: 'wall' },
      { x: 0.62, y: 0.58, w: 0.05, h: 0.28, type: 'wall' },
    ],
    collectibles: [
      { x: 0.15, y: 0.65 },
      { x: 0.40, y: 0.65 },   // low passage
      { x: 0.50, y: 0.35 },   // high passage after wall A
      { x: 0.78, y: 0.35 },
    ],
    movingObstacles: [
      // patrols the low gap between the two walls
      { x: 0.45, y: 0.65, w: 0.06, h: 0.10, axis: 'x', range: 0.10, speed: 1.8 },
      // patrols the high gap near goal
      { x: 0.75, y: 0.35, w: 0.06, h: 0.10, axis: 'y', range: 0.10, speed: 2.2 },
    ],
    switches: [], gates: [], costZones: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 11–15 · Switches, gates, and cost terrain
  // ═══════════════════════════════════════════════════════════════

  {
    // Gate blocks the direct corridor. Switch is placed in a side detour
    // ABOVE the gate. Player must first go up, hit switch, then come back down.
    // Gate: x=0.50, y=0.50, blocks [0.48,0.52] × [0.40,0.60].
    // Switch: x=0.50, y=0.28 — clearly above the gate, reachable before it.
    id: 11, name: "Open Sesame",
    paint: 460, bg: 0xe8d5f5,
    start: { x: 0.08, y: 0.50 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [],
    collectibles: [
      { x: 0.28, y: 0.50 },
      { x: 0.50, y: 0.28 },   // same spot as the detour to reach switch
      { x: 0.72, y: 0.50 },
    ],
    movingObstacles: [],
    switches: [
      { x: 0.50, y: 0.28, id: 'A' },  // above the gate
    ],
    gates: [
      // spans [0.48,0.52] horizontally × [0.40,0.60] vertically
      { x: 0.50, y: 0.50, w: 0.04, h: 0.20, id: 'A', open: false },
    ],
    costZones: [],
  },

  {
    // Cost zone covers the central corridor — player saves paint by routing
    // around it. No gates. Introduces paint economy.
    // Zone: centre x=0.50, y=0.50 covering a wide middle band.
    id: 12, name: "Muddy Path",
    paint: 500, bg: 0xd7ccc8,
    start: { x: 0.08, y: 0.50 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [
      // Two walls funnel player toward the cost zone or a longer detour
      { x: 0.32, y: 0.36, w: 0.04, h: 0.20, type: 'wall' },
      { x: 0.68, y: 0.64, w: 0.04, h: 0.20, type: 'wall' },
    ],
    collectibles: [
      { x: 0.20, y: 0.50 },
      { x: 0.50, y: 0.28 },   // top detour reward
      { x: 0.50, y: 0.72 },   // bottom detour reward
      { x: 0.80, y: 0.50 },
    ],
    movingObstacles: [],
    switches: [],
    gates: [],
    // Cost zone covers direct centre line; ×2.5 cost
    costZones: [{ x: 0.50, y: 0.50, w: 0.22, h: 0.26, cost: 2.5 }],
  },

  {
    // Two gates — two switches. Each switch is a detour in opposite directions.
    // Switch A is above, opens Gate A (upper choke).
    // Switch B is below, opens Gate B (lower choke).
    // Player needs to visit both detours. Moving obstacle guards the centre.
    id: 13, name: "Two Keys",
    paint: 500, bg: 0xb2dfdb,
    start: { x: 0.08, y: 0.50 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [],
    collectibles: [
      { x: 0.22, y: 0.50 },
      { x: 0.38, y: 0.26 },   // near switch A
      { x: 0.38, y: 0.74 },   // near switch B
      { x: 0.72, y: 0.50 },
    ],
    movingObstacles: [
      // Guard at x=0.55 sweeps y [0.40, 0.60] — forces commit to a detour
      { x: 0.55, y: 0.50, w: 0.06, h: 0.10, axis: 'y', range: 0.12, speed: 1.6 },
    ],
    switches: [
      { x: 0.38, y: 0.26, id: 'A' },  // top detour
      { x: 0.38, y: 0.74, id: 'B' },  // bottom detour
    ],
    gates: [
      // Gate A blocks upper half of the choke at x=0.50
      { x: 0.50, y: 0.36, w: 0.04, h: 0.14, id: 'A', open: false },
      // Gate B blocks lower half of the choke at x=0.50
      { x: 0.50, y: 0.64, w: 0.04, h: 0.14, id: 'B', open: false },
    ],
    costZones: [],
  },

  {
    // Dark level. Cost zone on the right half. Gate blocks direct path.
    // Switch in top-left forces a long detour before the gate.
    // Moving obstacle guards the right zone exit.
    id: 14, name: "Tar Pit",
    paint: 540, bg: 0x263238,
    start: { x: 0.08, y: 0.60 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [
      { x: 0.36, y: 0.36, w: 0.04, h: 0.20, type: 'wall' },
    ],
    collectibles: [
      { x: 0.20, y: 0.60 },
      { x: 0.20, y: 0.28 },   // top-left detour
      { x: 0.60, y: 0.28 },   // across top before cost zone
      { x: 0.80, y: 0.50 },
    ],
    movingObstacles: [
      { x: 0.72, y: 0.50, w: 0.06, h: 0.10, axis: 'y', range: 0.18, speed: 2.0 },
    ],
    switches: [
      { x: 0.20, y: 0.28, id: 'A' },  // top-left — forces detour first
    ],
    gates: [
      // Gate blocks at x=0.50, mid height
      { x: 0.50, y: 0.50, w: 0.04, h: 0.20, id: 'A', open: false },
    ],
    // Right corridor — costly to cut straight through
    costZones: [{ x: 0.72, y: 0.50, w: 0.22, h: 0.30, cost: 3.0 }],
  },

  {
    // Full labyrinth: three vertical walls, two horizontal shelves,
    // one gate + switch, one moving obstacle, one cost zone.
    // Clear path exists: thread through the gaps between each wall segment.
    // Wall A: x=0.24, spans y [0.28, 0.54] → gap below y>0.56
    // Wall B: x=0.48, spans y [0.46, 0.72] → gap above y<0.44
    // Wall C: x=0.72, spans y [0.28, 0.54] → gap below y>0.56
    // Shelf: x=[0.24,0.48], y=0.28 — top ceiling partial
    id: 15, name: "Labyrinth",
    paint: 560, bg: 0x1a237e,
    start: { x: 0.08, y: 0.62 },
    goal:  { x: 0.92, y: 0.62 },
    obstacles: [
      { x: 0.24, y: 0.41, w: 0.04, h: 0.26, type: 'wall' },   // A: gap below 0.56
      { x: 0.48, y: 0.59, w: 0.04, h: 0.26, type: 'wall' },   // B: gap above 0.44
      { x: 0.72, y: 0.41, w: 0.04, h: 0.26, type: 'wall' },   // C: gap below 0.56
      // Horizontal connection between A and B (forces up-route commitment)
      { x: 0.36, y: 0.28, w: 0.28, h: 0.04, type: 'wall' },
    ],
    collectibles: [
      { x: 0.14, y: 0.62 },
      { x: 0.36, y: 0.62 },   // low passage after wall A
      { x: 0.60, y: 0.34 },   // high passage after wall B
      { x: 0.82, y: 0.62 },
    ],
    movingObstacles: [
      // Guards the lower gap near wall C
      { x: 0.84, y: 0.62, w: 0.06, h: 0.10, axis: 'y', range: 0.12, speed: 1.8 },
    ],
    switches: [
      { x: 0.36, y: 0.62, id: 'A' },   // low-left passage — natural route
    ],
    gates: [
      { x: 0.60, y: 0.62, w: 0.04, h: 0.18, id: 'A', open: false },
    ],
    costZones: [
      // Centre top — cheaper to route low
      { x: 0.60, y: 0.34, w: 0.20, h: 0.18, cost: 2.0 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 16–20 · Everything combined · Hard
  // ═══════════════════════════════════════════════════════════════

  {
    // Start bottom-left, goal top-right.
    // Three wall segments form a Z-pattern.
    // One gate + switch, one cost zone in upper corridor, one fast mover.
    id: 16, name: "Master Plan",
    paint: 520, bg: 0x4a148c,
    start: { x: 0.08, y: 0.72 },
    goal:  { x: 0.92, y: 0.28 },
    obstacles: [
      // Z-wall left: spans y [0.44, 0.72]
      { x: 0.28, y: 0.58, w: 0.04, h: 0.28, type: 'wall' },
      // Z-shelf: spans x [0.28, 0.56], y=0.44
      { x: 0.42, y: 0.44, w: 0.28, h: 0.04, type: 'wall' },
      // Z-wall right: spans y [0.28, 0.44]
      { x: 0.56, y: 0.36, w: 0.04, h: 0.16, type: 'wall' },
    ],
    collectibles: [
      { x: 0.15, y: 0.72 },
      { x: 0.15, y: 0.38 },   // far left top — switch detour
      { x: 0.42, y: 0.64 },   // low corridor
      { x: 0.70, y: 0.28 },
      { x: 0.84, y: 0.28 },
    ],
    movingObstacles: [
      { x: 0.72, y: 0.36, w: 0.06, h: 0.10, axis: 'y', range: 0.18, speed: 2.0 },
    ],
    switches: [
      { x: 0.15, y: 0.38, id: 'A' },   // top-left detour
    ],
    gates: [
      { x: 0.28, y: 0.38, w: 0.04, h: 0.12, id: 'A', open: false },
    ],
    costZones: [
      { x: 0.72, y: 0.28, w: 0.24, h: 0.20, cost: 2.5 },
    ],
  },

  {
    // Serpentine three-corridor maze, goal at top-right.
    // Corridors: low (y≈0.66), mid (y≈0.50), high (y≈0.34).
    // Walls force snaking between corridors.
    id: 17, name: "The Serpent",
    paint: 540, bg: 0x006064,
    start: { x: 0.08, y: 0.66 },
    goal:  { x: 0.92, y: 0.34 },
    obstacles: [
      // First divider — forces low start
      { x: 0.28, y: 0.44, w: 0.04, h: 0.32, type: 'wall' },
      // Shelf connecting first and second divider at mid height
      { x: 0.40, y: 0.58, w: 0.28, h: 0.04, type: 'wall' },
      // Second divider — forces high
      { x: 0.52, y: 0.42, w: 0.04, h: 0.32, type: 'wall' },
      // Shelf at right — directs to goal
      { x: 0.72, y: 0.42, w: 0.24, h: 0.04, type: 'wall' },
    ],
    collectibles: [
      { x: 0.16, y: 0.66 },
      { x: 0.38, y: 0.66 },   // low corridor
      { x: 0.62, y: 0.34 },   // high corridor
      { x: 0.78, y: 0.34 },
      { x: 0.88, y: 0.34 },
    ],
    movingObstacles: [
      // Patrols the mid junction
      { x: 0.40, y: 0.42, w: 0.06, h: 0.10, axis: 'y', range: 0.12, speed: 2.0 },
      // Patrols the upper right corridor
      { x: 0.72, y: 0.34, w: 0.06, h: 0.10, axis: 'x', range: 0.10, speed: 1.8 },
    ],
    switches: [
      { x: 0.38, y: 0.66, id: 'A' },   // bottom corridor — before the gate
    ],
    gates: [
      { x: 0.52, y: 0.66, w: 0.04, h: 0.16, id: 'A', open: false },
    ],
    costZones: [
      { x: 0.62, y: 0.34, w: 0.24, h: 0.20, cost: 2.0 },
    ],
  },

  {
    // Pandemonium: dense layout with two gates, two switches, two movers.
    // Gates block the two passages at x=0.40. Switches are on far flanks.
    // Two movers patrol the right half of the map.
    id: 18, name: "Pandemonium",
    paint: 560, bg: 0x880e4f,
    start: { x: 0.08, y: 0.50 },
    goal:  { x: 0.92, y: 0.50 },
    obstacles: [
      // Horizontal spike bar — forces player above or below it
      { x: 0.30, y: 0.64, w: 0.24, h: 0.04, type: 'spike' },
      // Wall left of right corridor
      { x: 0.56, y: 0.36, w: 0.04, h: 0.20, type: 'wall' },
      // Wall right of right corridor
      { x: 0.76, y: 0.64, w: 0.04, h: 0.20, type: 'wall' },
    ],
    collectibles: [
      { x: 0.15, y: 0.34 },   // near switch A
      { x: 0.15, y: 0.66 },   // near switch B
      { x: 0.45, y: 0.34 },
      { x: 0.66, y: 0.50 },
      { x: 0.86, y: 0.50 },
    ],
    movingObstacles: [
      { x: 0.66, y: 0.50, w: 0.06, h: 0.10, axis: 'y', range: 0.18, speed: 2.2 },
      { x: 0.84, y: 0.50, w: 0.06, h: 0.10, axis: 'y', range: 0.18, speed: 2.6 },
    ],
    switches: [
      { x: 0.15, y: 0.34, id: 'A' },   // top-left detour
      { x: 0.15, y: 0.66, id: 'B' },   // bottom-left detour
    ],
    gates: [
      { x: 0.40, y: 0.38, w: 0.04, h: 0.14, id: 'A', open: false },
      { x: 0.40, y: 0.62, w: 0.04, h: 0.14, id: 'B', open: false },
    ],
    costZones: [
      { x: 0.66, y: 0.50, w: 0.20, h: 0.28, cost: 2.5 },
    ],
  },

  {
    // Final Exam: all mechanics at peak difficulty.
    // Goal is top-right. Three vertical walls. Spike shelves.
    // Two gates + switches. Three movers. Two cost zones.
    // Route: snake through low corridors, hit both switches, then
    //        navigate upper-right under heavy mover pressure.
    id: 19, name: "Final Exam",
    paint: 580, bg: 0x212121,
    start: { x: 0.08, y: 0.68 },
    goal:  { x: 0.92, y: 0.32 },
    obstacles: [
      // Wall A — blocks mid-left, gap above y<0.28 and below y>0.58
      { x: 0.26, y: 0.43, w: 0.04, h: 0.30, type: 'wall' },
      // Spike shelf at base of Wall A — punishes going too low
      { x: 0.26, y: 0.60, w: 0.18, h: 0.04, type: 'spike' },
      // Wall B — blocks centre, gap above y<0.34 and below y>0.64
      { x: 0.50, y: 0.49, w: 0.04, h: 0.30, type: 'wall' },
      // Wall C — guards upper right
      { x: 0.74, y: 0.38, w: 0.04, h: 0.24, type: 'wall' },
    ],
    collectibles: [
      { x: 0.14, y: 0.68 },
      { x: 0.14, y: 0.30 },   // switch A detour
      { x: 0.38, y: 0.68 },
      { x: 0.62, y: 0.30 },   // switch B detour
      { x: 0.84, y: 0.32 },
    ],
    movingObstacles: [
      { x: 0.38, y: 0.68, w: 0.06, h: 0.10, axis: 'x', range: 0.08, speed: 2.0 },
      { x: 0.62, y: 0.30, w: 0.06, h: 0.10, axis: 'y', range: 0.10, speed: 2.4 },
      { x: 0.84, y: 0.44, w: 0.06, h: 0.10, axis: 'y', range: 0.14, speed: 2.0 },
    ],
    switches: [
      { x: 0.14, y: 0.30, id: 'A' },   // top-left
      { x: 0.62, y: 0.30, id: 'B' },   // top-centre
    ],
    gates: [
      { x: 0.26, y: 0.30, w: 0.04, h: 0.14, id: 'A', open: false },
      { x: 0.50, y: 0.30, w: 0.04, h: 0.14, id: 'B', open: false },
    ],
    costZones: [
      { x: 0.50, y: 0.30, w: 0.18, h: 0.22, cost: 2.0 },
      { x: 0.74, y: 0.30, w: 0.18, h: 0.22, cost: 3.0 },
    ],
  },

  {
    // Grand Finale: the hardest level.
    // Start bottom-left, goal top-right.
    // Four vertical walls alternate high/low gaps (snaking corridor).
    // Spike shelves at floor of each choke. Three gates, three switches.
    // Four movers — two fast, two medium. Two heavy cost zones.
    // Optimal path visits all three switches before the three gates.
    id: 20, name: "Grand Finale",
    paint: 620, bg: 0x1b0000,
    start: { x: 0.08, y: 0.72 },
    goal:  { x: 0.92, y: 0.28 },
    obstacles: [
      // Wall A: gap below y>0.58
      { x: 0.22, y: 0.38, w: 0.04, h: 0.28, type: 'wall' },
      // Spike at base of wall A
      { x: 0.22, y: 0.54, w: 0.14, h: 0.04, type: 'spike' },
      // Wall B: gap above y<0.42
      { x: 0.40, y: 0.57, w: 0.04, h: 0.28, type: 'wall' },
      // Wall C: gap below y>0.56
      { x: 0.60, y: 0.40, w: 0.04, h: 0.28, type: 'wall' },
      // Spike at base of wall C
      { x: 0.60, y: 0.56, w: 0.14, h: 0.04, type: 'spike' },
      // Wall D: gap above y<0.38
      { x: 0.78, y: 0.53, w: 0.04, h: 0.28, type: 'wall' },
    ],
    collectibles: [
      { x: 0.12, y: 0.72 },
      { x: 0.12, y: 0.28 },   // switch A detour
      { x: 0.50, y: 0.28 },   // switch B detour
      { x: 0.50, y: 0.72 },   // low corridor mid
      { x: 0.88, y: 0.28 },
    ],
    movingObstacles: [
      // Guards gap below wall A
      { x: 0.30, y: 0.66, w: 0.06, h: 0.10, axis: 'x', range: 0.08, speed: 2.4 },
      // Guards gap above wall B
      { x: 0.50, y: 0.34, w: 0.06, h: 0.10, axis: 'x', range: 0.08, speed: 2.8 },
      // Guards gap below wall C
      { x: 0.68, y: 0.66, w: 0.06, h: 0.10, axis: 'x', range: 0.08, speed: 2.2 },
      // Guards final approach
      { x: 0.86, y: 0.36, w: 0.06, h: 0.10, axis: 'y', range: 0.10, speed: 3.0 },
    ],
    switches: [
      { x: 0.12, y: 0.28, id: 'A' },   // top-left — first detour
      { x: 0.50, y: 0.28, id: 'B' },   // top-centre — second detour
      { x: 0.50, y: 0.72, id: 'C' },   // bottom-centre — third detour
    ],
    gates: [
      { x: 0.22, y: 0.28, w: 0.04, h: 0.14, id: 'A', open: false },
      { x: 0.60, y: 0.28, w: 0.04, h: 0.14, id: 'B', open: false },
      { x: 0.78, y: 0.72, w: 0.04, h: 0.14, id: 'C', open: false },
    ],
    costZones: [
      { x: 0.40, y: 0.28, w: 0.20, h: 0.22, cost: 2.5 },
      { x: 0.78, y: 0.32, w: 0.18, h: 0.20, cost: 3.5 },
    ],
  },
];

export default LEVELS;