// PIN guard: SHA256(salt+pin) hashing, verify with cooldown, recovery flow,
// and an unlock window. Storage is chrome.storage.local only (privacy invariant M6).

import * as storage from "./storage.js";
import {
  STORAGE_KEYS,
  PIN_COOLDOWN_MS,
  PIN_UNLOCK_DURATION_MS,
  PIN_MAX_ATTEMPTS_BEFORE_COOLDOWN,
} from "./constants.js";

const SALT_BYTES = 16;

/**
 * Generate a random salt as a hex string.
 * @returns {string}
 */
function generateSaltHex() {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * SHA-256 hex digest.
 * @param {string} input
 * @returns {Promise<string>}
 */
async function sha256Hex(input) {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
  const out = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i].toString(16).padStart(2, "0");
  }
  return out.join("");
}

/**
 * Establish a fresh PIN + recovery question/answer.
 * @param {{ pin: string, recoveryQ: string, recoveryA: string }} params
 * @returns {Promise<void>}
 */
export async function setPin({ pin, recoveryQ, recoveryA }) {
  validatePinFormat(pin);
  if (!recoveryQ || typeof recoveryQ !== "string" || recoveryQ.trim().length === 0) {
    throw new Error("RECOVERY_Q_REQUIRED");
  }
  if (!recoveryA || typeof recoveryA !== "string" || recoveryA.trim().length < 2) {
    throw new Error("RECOVERY_A_TOO_SHORT");
  }
  const salt = generateSaltHex();
  const pinHash = await sha256Hex(salt + pin);
  const recoveryHash = await sha256Hex(salt + normalizeAnswer(recoveryA));
  await storage.setMany({
    [STORAGE_KEYS.pinSalt]: salt,
    [STORAGE_KEYS.pinHash]: pinHash,
    [STORAGE_KEYS.pinRecoveryQ]: recoveryQ.trim(),
    [STORAGE_KEYS.pinRecoveryAHash]: recoveryHash,
    [STORAGE_KEYS.pinFailCount]: 0,
    [STORAGE_KEYS.pinCooldownUntil]: 0,
    [STORAGE_KEYS.pinUnlockUntil]: 0,
  });
}

/**
 * Update PIN only, preserving the existing salt + recovery question/answer hash.
 * Used when the parent rotates PIN from the options page.
 * @param {string} newPin
 * @returns {Promise<void>}
 */
export async function updatePin(newPin) {
  validatePinFormat(newPin);
  const salt = await storage.get(STORAGE_KEYS.pinSalt, "");
  if (!salt) throw new Error("PIN_NOT_SET");
  const pinHash = await sha256Hex(salt + newPin);
  await storage.setMany({
    [STORAGE_KEYS.pinHash]: pinHash,
    [STORAGE_KEYS.pinFailCount]: 0,
    [STORAGE_KEYS.pinCooldownUntil]: 0,
  });
}

/**
 * Update recovery question + answer only, preserving the existing PIN.
 * Recovery answer is rehashed against the existing salt.
 * @param {{ recoveryQ: string, recoveryA: string }} params
 * @returns {Promise<void>}
 */
export async function updateRecovery({ recoveryQ, recoveryA }) {
  if (!recoveryQ || typeof recoveryQ !== "string" || recoveryQ.trim().length === 0) {
    throw new Error("RECOVERY_Q_REQUIRED");
  }
  if (!recoveryA || typeof recoveryA !== "string" || recoveryA.trim().length < 2) {
    throw new Error("RECOVERY_A_TOO_SHORT");
  }
  const salt = await storage.get(STORAGE_KEYS.pinSalt, "");
  if (!salt) throw new Error("PIN_NOT_SET");
  const recoveryHash = await sha256Hex(salt + normalizeAnswer(recoveryA));
  await storage.setMany({
    [STORAGE_KEYS.pinRecoveryQ]: recoveryQ.trim(),
    [STORAGE_KEYS.pinRecoveryAHash]: recoveryHash,
  });
}

/**
 * Returns true if a PIN has been configured.
 * @returns {Promise<boolean>}
 */
export async function isPinSet() {
  const hash = await storage.get(STORAGE_KEYS.pinHash, "");
  return Boolean(hash);
}

/**
 * Verify a PIN attempt. Returns { unlocked, until } on success;
 * throws on failure (with PIN_LOCKED on cooldown).
 * @param {string} pin
 * @returns {Promise<{ unlocked: boolean, until: number }>}
 */
export async function verify(pin) {
  validatePinFormat(pin);
  const now = Date.now();
  const state = await storage.getMany({
    [STORAGE_KEYS.pinSalt]: "",
    [STORAGE_KEYS.pinHash]: "",
    [STORAGE_KEYS.pinFailCount]: 0,
    [STORAGE_KEYS.pinCooldownUntil]: 0,
  });
  if (!state[STORAGE_KEYS.pinHash]) throw new Error("PIN_NOT_SET");
  const cooldownUntil = Number(state[STORAGE_KEYS.pinCooldownUntil]) || 0;
  if (cooldownUntil > now) throw new Error("PIN_LOCKED");

  const candidate = await sha256Hex(state[STORAGE_KEYS.pinSalt] + pin);
  if (candidate === state[STORAGE_KEYS.pinHash]) {
    const until = now + PIN_UNLOCK_DURATION_MS;
    await storage.setMany({
      [STORAGE_KEYS.pinUnlockUntil]: until,
      [STORAGE_KEYS.pinFailCount]: 0,
      [STORAGE_KEYS.pinCooldownUntil]: 0,
    });
    return { unlocked: true, until };
  }
  const failCount = (Number(state[STORAGE_KEYS.pinFailCount]) || 0) + 1;
  /** @type {Record<string, unknown>} */
  const updates = { [STORAGE_KEYS.pinFailCount]: failCount };
  if (failCount >= PIN_MAX_ATTEMPTS_BEFORE_COOLDOWN) {
    updates[STORAGE_KEYS.pinCooldownUntil] = now + PIN_COOLDOWN_MS;
    updates[STORAGE_KEYS.pinFailCount] = 0;
  }
  await storage.setMany(updates);
  throw new Error(failCount >= PIN_MAX_ATTEMPTS_BEFORE_COOLDOWN ? "PIN_LOCKED" : "PIN_WRONG");
}

/**
 * Recover by answering the recovery question and immediately setting a new PIN.
 * Note: caller is expected to also collect a new recoveryQ/A pair via setPin
 * if they want to rotate it. This call only resets the PIN hash itself.
 * @param {{ recoveryA: string, newPin: string }} params
 * @returns {Promise<{ ok: boolean }>}
 */
export async function recover({ recoveryA, newPin }) {
  validatePinFormat(newPin);
  const state = await storage.getMany({
    [STORAGE_KEYS.pinSalt]: "",
    [STORAGE_KEYS.pinRecoveryAHash]: "",
  });
  if (!state[STORAGE_KEYS.pinRecoveryAHash]) throw new Error("RECOVERY_NOT_SET");
  const candidate = await sha256Hex(state[STORAGE_KEYS.pinSalt] + normalizeAnswer(recoveryA));
  if (candidate !== state[STORAGE_KEYS.pinRecoveryAHash]) {
    throw new Error("RECOVERY_WRONG");
  }
  const newHash = await sha256Hex(state[STORAGE_KEYS.pinSalt] + newPin);
  await storage.setMany({
    [STORAGE_KEYS.pinHash]: newHash,
    [STORAGE_KEYS.pinFailCount]: 0,
    [STORAGE_KEYS.pinCooldownUntil]: 0,
    [STORAGE_KEYS.pinUnlockUntil]: 0,
  });
  return { ok: true };
}

/**
 * Whether the editor is currently inside the unlock window.
 * @returns {Promise<boolean>}
 */
export async function isUnlocked() {
  const until = Number(await storage.get(STORAGE_KEYS.pinUnlockUntil, 0)) || 0;
  return until > Date.now();
}

/**
 * Throw if not unlocked. Use as a guard at the top of write handlers.
 * @returns {Promise<void>}
 */
export async function requirePinUnlocked() {
  if (!(await isUnlocked())) throw new Error("PIN_REQUIRED");
}

/**
 * Force-lock the editor (used when user explicitly logs out).
 * @returns {Promise<void>}
 */
export async function lock() {
  await storage.set(STORAGE_KEYS.pinUnlockUntil, 0);
}

/**
 * Get the configured recovery question (for UI prompt). Empty string if unset.
 * @returns {Promise<string>}
 */
export async function getRecoveryQuestion() {
  return /** @type {string} */ (await storage.get(STORAGE_KEYS.pinRecoveryQ, ""));
}

/**
 * @param {string} pin
 */
function validatePinFormat(pin) {
  if (typeof pin !== "string" || !/^[0-9]{4,6}$/.test(pin)) {
    throw new Error("PIN_FORMAT");
  }
}

/**
 * @param {string} answer
 * @returns {string}
 */
function normalizeAnswer(answer) {
  return answer.trim().toLowerCase();
}
