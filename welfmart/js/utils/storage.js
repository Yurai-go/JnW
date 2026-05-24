/**
 * storage.js — Welfmart localStorage Abstraction Layer
 * =====================================================
 * Wraps all localStorage calls so the app can be migrated
 * to a real API by replacing only this file.
 *
 * Namespace: "wm_" prefix on all keys to avoid collisions.
 * Location: js/utils/storage.js
 */

'use strict';

const NS = 'wm_';

/**
 * Saves a value under a namespaced key.
 * @param {string} key
 * @param {*}      value - Will be JSON-serialised
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    console.error('[Storage] Write failed:', key, e);
  }
}

/**
 * Retrieves a value by key. Returns defaultValue if absent or malformed.
 * @param {string} key
 * @param {*}      [defaultValue=null]
 * @returns {*}
 */
export function storageGet(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('[Storage] Read/parse failed:', key, e);
    return defaultValue;
  }
}

/**
 * Removes a single key.
 * @param {string} key
 */
export function storageRemove(key) {
  localStorage.removeItem(NS + key);
}

/**
 * Clears all Welfmart keys (logout / factory reset).
 */
export function storageClear() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(NS));
  keys.forEach(k => localStorage.removeItem(k));
}

/* ── Convenience session helpers ─────────────────────────── */

/**
 * Returns the currently logged-in user object, or null.
 */
export function getCurrentUser() {
  return storageGet('session_user', null);
}

/**
 * Persists the session user (called after successful login).
 * @param {Object} user
 */
export function setCurrentUser(user) {
  storageSet('session_user', user);
}

/**
 * Clears the session (logout).
 */
export function clearSession() {
  storageRemove('session_user');
  storageRemove('cart');
}