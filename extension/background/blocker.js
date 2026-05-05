// kg-blocker: enables/disables built-in static rulesets for each category and
// projects custom allow/deny lists into dynamic rules (id 1..1000).

import * as storage from "../shared/storage.js";
import {
  CATEGORY_IDS,
  RULESET_IDS,
  STORAGE_KEYS,
  CUSTOM_RULE_ID_MIN,
  CUSTOM_RULE_ID_MAX,
  PRIORITY_DENY,
  PRIORITY_ALLOW,
} from "../shared/constants.js";

/**
 * Default per-category enabled map: every built-in category ON.
 * @returns {Record<string, boolean>}
 */
function defaultCategoryEnabled() {
  /** @type {Record<string, boolean>} */
  const map = {};
  for (const id of CATEGORY_IDS) map[id] = true;
  return map;
}

/**
 * Apply current categoryEnabled map to declarativeNetRequest.
 * @returns {Promise<void>}
 */
export async function applyCategoryToggles() {
  const stored = /** @type {Record<string, boolean>} */ (
    await storage.get(STORAGE_KEYS.categoryEnabled, defaultCategoryEnabled())
  );
  const enableRulesetIds = [];
  const disableRulesetIds = [];
  for (const id of RULESET_IDS) {
    if (stored[id] === false) disableRulesetIds.push(id);
    else enableRulesetIds.push(id);
  }
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds,
    disableRulesetIds,
  });
}

/**
 * Toggle a single category and persist.
 * @param {string} category
 * @param {boolean} enabled
 * @returns {Promise<{ enabled: boolean }>}
 */
export async function setCategoryEnabled(category, enabled) {
  if (!CATEGORY_IDS.includes(category)) throw new Error("UNKNOWN_CATEGORY");
  const map = /** @type {Record<string, boolean>} */ (
    await storage.get(STORAGE_KEYS.categoryEnabled, defaultCategoryEnabled())
  );
  map[category] = Boolean(enabled);
  await storage.set(STORAGE_KEYS.categoryEnabled, map);
  await applyCategoryToggles();
  return { enabled: map[category] };
}

/**
 * Replace dynamic allow/deny rules atomically.
 * @param {{ allow?: string[], deny?: string[] }} params
 * @returns {Promise<{ allow: string[], deny: string[] }>}
 */
export async function updateCustomLists({ allow, deny } = {}) {
  const current = await storage.getMany({
    [STORAGE_KEYS.customAllow]: [],
    [STORAGE_KEYS.customDeny]: [],
  });
  const nextAllow = sanitizeHostList(
    Array.isArray(allow) ? allow : /** @type {string[]} */ (current[STORAGE_KEYS.customAllow])
  );
  const nextDeny = sanitizeHostList(
    Array.isArray(deny) ? deny : /** @type {string[]} */ (current[STORAGE_KEYS.customDeny])
  );

  const removeRuleIds = rangeIds(CUSTOM_RULE_ID_MIN, CUSTOM_RULE_ID_MAX);
  const addRules = buildCustomDynamicRules(nextAllow, nextDeny);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
  await storage.setMany({
    [STORAGE_KEYS.customAllow]: nextAllow,
    [STORAGE_KEYS.customDeny]: nextDeny,
  });
  return { allow: nextAllow, deny: nextDeny };
}

/**
 * Re-apply persisted custom lists at startup (no UI input).
 * @returns {Promise<void>}
 */
export async function refreshCustomListsFromStorage() {
  const current = await storage.getMany({
    [STORAGE_KEYS.customAllow]: [],
    [STORAGE_KEYS.customDeny]: [],
  });
  await updateCustomLists({
    allow: /** @type {string[]} */ (current[STORAGE_KEYS.customAllow]),
    deny: /** @type {string[]} */ (current[STORAGE_KEYS.customDeny]),
  });
}

/**
 * Normalize a single user-entered host string. Strips protocol/path/port and
 * lowercases. Returns null if invalid.
 * @param {string} input
 * @returns {string | null}
 */
export function normalizeHost(input) {
  if (typeof input !== "string") return null;
  let host = input.trim().toLowerCase();
  if (!host) return null;
  // Strip scheme
  host = host.replace(/^[a-z][a-z0-9+\-.]*:\/\//, "");
  // Strip everything past first /, ?, #
  host = host.split(/[/?#]/, 1)[0];
  // Strip port
  host = host.split(":", 1)[0];
  // Drop leading "*."
  host = host.replace(/^\*\./, "");
  if (!host) return null;
  // Validate hostname: labels of [a-z0-9-], not starting/ending with -
  const labelRe = /^(?=.{1,63}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  const labels = host.split(".");
  if (labels.length < 2) return null;
  for (const label of labels) {
    if (!labelRe.test(label)) return null;
  }
  // TLD must contain at least one alpha
  if (!/[a-z]/.test(labels[labels.length - 1])) return null;
  return host;
}

/**
 * @param {string[]} list
 * @returns {string[]} unique normalized hostnames in input order
 */
function sanitizeHostList(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const h = normalizeHost(raw);
    if (h && !seen.has(h)) {
      seen.add(h);
      out.push(h);
    }
  }
  return out;
}

/**
 * Build dynamic rules from allow/deny lists. Allow priority 3, deny priority 2.
 * @param {string[]} allow
 * @param {string[]} deny
 * @returns {chrome.declarativeNetRequest.Rule[]}
 */
function buildCustomDynamicRules(allow, deny) {
  /** @type {chrome.declarativeNetRequest.Rule[]} */
  const rules = [];
  let id = CUSTOM_RULE_ID_MIN;
  for (const host of allow) {
    if (id > CUSTOM_RULE_ID_MAX) break;
    rules.push({
      id: id++,
      priority: PRIORITY_ALLOW,
      action: { type: "allow" },
      condition: {
        urlFilter: `||${host}^`,
        resourceTypes: ["main_frame"],
      },
    });
  }
  for (const host of deny) {
    if (id > CUSTOM_RULE_ID_MAX) break;
    rules.push({
      id: id++,
      priority: PRIORITY_DENY,
      action: {
        type: "redirect",
        redirect: {
          extensionPath: `/blocked/blocked.html?reason=manual_deny&host=${encodeURIComponent(host)}`,
        },
      },
      condition: {
        urlFilter: `||${host}^`,
        resourceTypes: ["main_frame"],
      },
    });
  }
  return rules;
}

/**
 * Inclusive integer range as an array of ids.
 * @param {number} from
 * @param {number} to
 * @returns {number[]}
 */
function rangeIds(from, to) {
  const out = new Array(to - from + 1);
  for (let i = 0; i < out.length; i++) out[i] = from + i;
  return out;
}
