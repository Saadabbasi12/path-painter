/**
 * BootScene.js  —  YouTube Playables edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Call YT.firstFrameReady() — MUST be called when the loading screen is
 *     visible. YouTube hides the game until this is called.
 *
 *     CRITICAL FIX: YouTube WebView starts with a 0×0 viewport. Phaser's
 *     BootScene.create() may fire before the viewport is resized to its real
 *     dimensions. We call firstFrameReady() immediately in create() regardless
 *     of viewport size — this is correct because YouTube only cares that the
 *     call happens, not that pixels are physically visible yet. The loading
 *     screen content is drawn defensively after a resize-safe tick.
 *
 *  2. Await SaveManager.init() — loads cloud save into memory.
 *  3. Wire SDK pause/resume/audio handlers that persist across all scenes.
 *  4. Hand off to PreloadScene.
 *
 * NOTE: YT.gameReady() is called in MenuScene, NOT here.
 */

import Phaser from "phaser";
import YT from "../managers/YouTubeSDK.js";
import SaveManager from "../managers/SaveManager.js";
import SoundManager from "../managers/SoundManager.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    // ✅ firstFrameReady — call IMMEDIATELY in create(), before anything else.
    // YouTube requires this as soon as the game starts rendering frames.
    // This must happen even if viewport is currently 0×0 (YouTube WebView
    // initialises with zero size before expanding to real dimensions).
    YT.firstFrameReady();

    // ── Wire pause / resume (MUST use SDK — never Page Visibility API) ──────
    YT.onPause(() => {
      // Pause all active Phaser scenes
      this.scene.manager.getScenes(true).forEach(scene => {
        if (scene.scene.key !== "BootScene") {
          scene.scene.pause();
        }
      });
      // Mute all audio immediately
      SoundManager.setMuted(true);
    });

    YT.onResume(() => {
      // Resume all paused scenes
      this.scene.manager.getScenes(false).forEach(scene => {
        if (scene.scene.isPaused()) {
          scene.scene.resume();
        }
      });
      // Restore audio from YouTube's audio state
      SoundManager.setMuted(!YT.isAudioEnabled());
      // Resume AudioContext (browser autoplay policy may have suspended it)
      SoundManager.resumeContext();
    });

    // ── Wire audio state (MUST use SDK — not click-to-unmute hacks) ─────────
    SoundManager.setMuted(!YT.isAudioEnabled());

    YT.onAudioChange((isEnabled) => {
      SoundManager.setMuted(!isEnabled);
    });

    // ── Initialise SaveManager then hand off to PreloadScene ─────────────────
    SaveManager.init()
      .then(() => {
        this.scene.start("PreloadScene");
      })
      .catch((err) => {
        YT.logError(err);
        // Start anyway — better to show an empty-save game than to block
        this.scene.start("PreloadScene");
      });
  }
}