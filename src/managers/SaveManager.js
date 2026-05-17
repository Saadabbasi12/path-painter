const KEY = "pathpainter_save";

export default class SaveManager {
  static _data = null;

  static _load() {
    if (this._data) return;
    try {
      this._data = JSON.parse(localStorage.getItem(KEY)) || { levels: {} };
    } catch { this._data = { levels: {} }; }
  }

  static _save() {
    localStorage.setItem(KEY, JSON.stringify(this._data));
  }

  static getStars(level) {
    this._load();
    return this._data.levels[level]?.stars || 0;
  }

  static setStars(level, stars) {
    this._load();
    const current = this.getStars(level);
    if (stars > current) {
      this._data.levels[level] = { stars };
      this._save();
    }
  }

  static isUnlocked(level) {
    if (level === 1) return true;
    return this.getStars(level - 1) > 0;
  }

  static getTotalStars() {
    this._load();
    return Object.values(this._data.levels).reduce((sum, l) => sum + (l.stars || 0), 0);
  }

  static reset() {
    this._data = { levels: {} };
    this._save();
  }
}
