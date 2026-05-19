/**
 * SaveManager.js  —  YouTube Playables edition
 * ─────────────────────────────────────────────────────────────────────────────
 * All persistence goes through YouTubeSDK.save / YouTubeSDK.load.
 * When running outside YouTube (dev / preview) those methods fall back to
 * localStorage automatically, so no code change is needed for local dev.
 *
 * Save schema (minimal — well under 500 KiB soft cap):
 *   {
 *     v: 1,
 *     levels: {
 *       "1": { stars: 3 },
 *       "2": { stars: 1 },
 *       ...
 *     }
 *   }
 *
 * Total size estimate: 20 levels × ~20 bytes each ≈ < 1 KiB.
 */

import YT from "./YouTubeSDK.js";

const SCHEMA_VERSION = 1;

export default class SaveManager {
  static _data = null;
  static _loadPromise = null;

  // ── Internal ──────────────────────────────────────────────────────────────

  static async _ensureLoaded() {
    if (this._data) return;
    if (this._loadPromise) {
      await this._loadPromise;
      return;
    }
    this._loadPromise = YT.load().then(raw => {
      if (raw && raw.v === SCHEMA_VERSION && raw.levels) {
        this._data = raw;
      } else if (raw && raw.levels && !raw.v) {
        // Migrate from old schema (no version field)
        this._data = { v: SCHEMA_VERSION, levels: raw.levels };
      } else {
        this._data = { v: SCHEMA_VERSION, levels: {} };
      }
      this._loadPromise = null;
    }).catch(() => {
      this._data = { v: SCHEMA_VERSION, levels: {} };
      this._loadPromise = null;
    });
    await this._loadPromise;
  }

  static async _persist() {
    try {
      await YT.save(this._data);
    } catch (persistErr) {
      YT.logError(persistErr);
    }
  }

  // ── Public sync API (reads — safe after init resolves) ────────────────────

  static getStars(level) {
    if (!this._data) return 0;
    return this._data.levels[String(level)]?.stars || 0;
  }

  static isUnlocked(level) {
    if (level === 1) return true;
    return this.getStars(level - 1) > 0;
  }

  static getTotalStars() {
    if (!this._data) return 0;
    return Object.values(this._data.levels)
      .reduce((sum, lvl) => sum + (lvl.stars || 0), 0);
  }

  // ── Public async API (mutations) ──────────────────────────────────────────

  static async init() {
    await this._ensureLoaded();
  }

  /**
   * Record stars for a level (only updates if higher than current value).
   * Returns true if the value was updated.
   */
  static async setStars(level, stars) {
    await this._ensureLoaded();
    const key     = String(level);
    const current = this._data.levels[key]?.stars || 0;
    if (stars > current) {
      this._data.levels[key] = { stars };
      await this._persist();
      return true;
    }
    return false;
  }

  static async reset() {
    this._data = { v: SCHEMA_VERSION, levels: {} };
    await this._persist();
  }
}