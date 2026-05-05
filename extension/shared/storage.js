// Typed wrapper around chrome.storage.local. All persistence in this extension
// goes through this module so tests / mocks have one seam.

/**
 * Read a key, falling back to the default if missing or undefined.
 * @template T
 * @param {string} key
 * @param {T} [fallback]
 * @returns {Promise<T>}
 */
export async function get(key, fallback = undefined) {
  const result = await chrome.storage.local.get(key);
  const value = result[key];
  return value === undefined ? fallback : value;
}

/**
 * Read several keys at once.
 * @param {Record<string, unknown>} defaults Map of key -> default value.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getMany(defaults) {
  const keys = Object.keys(defaults);
  const result = await chrome.storage.local.get(keys);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of keys) {
    out[k] = result[k] === undefined ? defaults[k] : result[k];
  }
  return out;
}

/**
 * Write a key.
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

/**
 * Write several keys at once.
 * @param {Record<string, unknown>} entries
 * @returns {Promise<void>}
 */
export async function setMany(entries) {
  await chrome.storage.local.set(entries);
}

/**
 * Remove a key (or array of keys).
 * @param {string | string[]} key
 * @returns {Promise<void>}
 */
export async function remove(key) {
  await chrome.storage.local.remove(key);
}

/**
 * Clear all extension storage. Used by reset flows; never called from UI directly.
 * @returns {Promise<void>}
 */
export async function clearAll() {
  await chrome.storage.local.clear();
}
