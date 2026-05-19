/**
 * YouTubeSDK.js  —  YouTube Playables SDK wrapper
 *
 * FIXES applied:
 *
 * 1. logError / logWarning signatures:
 *    The real SDK's ytgame.health.logError() and logWarning() take NO
 *    arguments per the official docs. Passing an Error object caused a
 *    silent type error in the Playables environment. Now we log locally
 *    for debugging but call the SDK methods with no args (as documented).
 *
 * 2. getLanguage() is async (returns Promise<string>):
 *    The original code called it synchronously and returned a wrong type.
 *    Fixed to be properly async.
 *
 * 3. save() size enforcement:
 *    Hard limit check now correctly uses byte length (TextEncoder), not
 *    string .length (which counts UTF-16 code units, not bytes).
 *
 * 4. Variable names use LONG names throughout to prevent minifier
 *    variable-shadowing bugs (e.g. catch(e) shadowing outer `e`).
 */

const SAVE_KEY = "pathpainter_save";

function _inPlayables() {
  return !!(typeof ytgame !== "undefined" && ytgame && ytgame.IN_PLAYABLES_ENV);
}

// NOTE: ytgame.health.logError() / logWarning() take NO arguments per the SDK
// reference. We console.error locally for dev visibility but never pass
// arguments to the SDK functions.
function _logError(errObj) {
  try {
    console.error("[YouTubeSDK]", errObj);
    if (_inPlayables()) {
      ytgame.health.logError();
    }
  } catch (ignoredErr) {
    // Never propagate SDK errors
  }
}

function _logWarning(msgStr) {
  try {
    console.warn("[YouTubeSDK]", msgStr);
    if (_inPlayables()) {
      ytgame.health.logWarning();
    }
  } catch (ignoredErr) {
    // Never propagate SDK errors
  }
}

function firstFrameReady() {
  try {
    if (_inPlayables()) {
      ytgame.game.firstFrameReady();
    }
  } catch (sdkErr) {
    _logError(sdkErr);
  }
}

function gameReady() {
  try {
    if (_inPlayables()) {
      ytgame.game.gameReady();
    }
  } catch (sdkErr) {
    _logError(sdkErr);
  }
}

function onPause(callbackFn) {
  try {
    if (_inPlayables()) {
      ytgame.system.onPause(callbackFn);
    }
  } catch (sdkErr) {
    _logError(sdkErr);
  }
}

function onResume(callbackFn) {
  try {
    if (_inPlayables()) {
      ytgame.system.onResume(callbackFn);
    }
  } catch (sdkErr) {
    _logError(sdkErr);
  }
}

function isAudioEnabled() {
  try {
    if (_inPlayables()) {
      return ytgame.system.isAudioEnabled();
    }
  } catch (sdkErr) {
    _logError(sdkErr);
  }
  return true; // default to audio on in dev
}

function onAudioChange(callbackFn) {
  try {
    if (_inPlayables()) {
      ytgame.system.onAudioEnabledChange(callbackFn);
    }
  } catch (sdkErr) {
    _logError(sdkErr);
  }
}

async function save(dataObject) {
  let serialisedStr;
  try {
    serialisedStr = JSON.stringify(dataObject);
  } catch (jsonErr) {
    _logError(jsonErr);
    return;
  }

  // FIX: Use TextEncoder to measure actual UTF-8 byte length, not string
  // character count (which undercounts multi-byte chars).
  const byteLength = new TextEncoder().encode(serialisedStr).length;

  if (byteLength > 500 * 1024) {
    _logWarning(
      "[YouTubeSDK] Save data exceeds 500 KiB soft cap: " + byteLength + " bytes"
    );
  }
  if (byteLength > 3 * 1024 * 1024) {
    _logError(
      new Error("[YouTubeSDK] Save data exceeds 3 MiB hard limit: " + byteLength + " bytes")
    );
    return; // Do NOT call saveData — YouTube will reject it
  }

  try {
    if (_inPlayables()) {
      await ytgame.game.saveData(serialisedStr);
    } else {
      window.localStorage.setItem(SAVE_KEY, serialisedStr);
    }
  } catch (saveErr) {
    _logError(saveErr);
  }
}

async function load() {
  let rawString;
  try {
    if (_inPlayables()) {
      rawString = await ytgame.game.loadData();
    } else {
      rawString = window.localStorage.getItem(SAVE_KEY);
    }
  } catch (loadErr) {
    _logError(loadErr);
    return {};
  }
  if (!rawString) return {};
  try {
    return JSON.parse(rawString);
  } catch (parseErr) {
    _logError(parseErr);
    return {};
  }
}

function sendScore(numValue) {
  try {
    if (_inPlayables()) {
      // Score must be an integer per the SDK spec
      ytgame.engagement.sendScore({ value: Math.round(numValue) });
    }
  } catch (sdkErr) {
    _logError(sdkErr);
  }
}

// FIX: getLanguage() is async — it returns Promise<string>
async function getLanguage() {
  try {
    if (_inPlayables()) {
      return await ytgame.system.getLanguage();
    }
  } catch (sdkErr) {
    _logError(sdkErr);
  }
  return (navigator && navigator.language) ? navigator.language : "en-US";
}

const YT = {
  inPlayables:     _inPlayables,
  firstFrameReady: firstFrameReady,
  gameReady:       gameReady,
  onPause:         onPause,
  onResume:        onResume,
  isAudioEnabled:  isAudioEnabled,
  onAudioChange:   onAudioChange,
  save:            save,
  load:            load,
  sendScore:       sendScore,
  logError:        _logError,
  logWarning:      _logWarning,
  getLanguage:     getLanguage,
};

export default YT;