// kg-search-blocker: builds dynamic regex rules that intercept search-engine
// queries containing flagged keywords and redirects to blocked.html.
//
// Keyword files (data/keywords/<category>.json) are produced by the data
// subagent. We read only the categories that are currently enabled.

import * as storage from "../shared/storage.js";
import {
  CATEGORY_IDS,
  STORAGE_KEYS,
  KEYWORD_RULE_ID_BASE,
  KEYWORD_RULE_ID_MAX_COUNT,
  PRIORITY_KEYWORD,
  SEARCH_ENGINE_HOSTS_REGEX_GROUP,
} from "../shared/constants.js";

/**
 * Default per-category enabled map.
 * @returns {Record<string, boolean>}
 */
function defaultCategoryEnabled() {
  /** @type {Record<string, boolean>} */
  const map = {};
  for (const id of CATEGORY_IDS) map[id] = true;
  return map;
}

/**
 * Persist keyword settings and rebuild rules.
 * @param {{ enabled?: boolean, custom?: string[] }} params
 * @returns {Promise<{ enabled: boolean, custom: string[] }>}
 */
export async function updateKeywords({ enabled, custom } = {}) {
  const current = await storage.getMany({
    [STORAGE_KEYS.keywordsEnabled]: true,
    [STORAGE_KEYS.keywordsCustom]: [],
  });
  const nextEnabled =
    typeof enabled === "boolean" ? enabled : Boolean(current[STORAGE_KEYS.keywordsEnabled]);
  const nextCustom = Array.isArray(custom)
    ? sanitizeKeywords(custom)
    : /** @type {string[]} */ (current[STORAGE_KEYS.keywordsCustom]);
  await storage.setMany({
    [STORAGE_KEYS.keywordsEnabled]: nextEnabled,
    [STORAGE_KEYS.keywordsCustom]: nextCustom,
  });
  await refreshDynamicRules();
  return { enabled: nextEnabled, custom: nextCustom };
}

/**
 * Recompute the keyword dynamic rule set from disk + storage and apply.
 * @returns {Promise<{ count: number, truncated: boolean }>}
 */
export async function refreshDynamicRules() {
  const state = await storage.getMany({
    [STORAGE_KEYS.keywordsEnabled]: true,
    [STORAGE_KEYS.keywordsCustom]: [],
    [STORAGE_KEYS.categoryEnabled]: defaultCategoryEnabled(),
  });
  const removeRuleIds = rangeIds(
    KEYWORD_RULE_ID_BASE,
    KEYWORD_RULE_ID_BASE + KEYWORD_RULE_ID_MAX_COUNT - 1
  );
  if (!state[STORAGE_KEYS.keywordsEnabled]) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
    return { count: 0, truncated: false };
  }
  const categoryEnabled = /** @type {Record<string, boolean>} */ (
    state[STORAGE_KEYS.categoryEnabled]
  );
  const custom = /** @type {string[]} */ (state[STORAGE_KEYS.keywordsCustom]);

  /** @type {Array<{ keyword: string, category: string }>} */
  const collected = [];
  for (const cat of CATEGORY_IDS) {
    if (categoryEnabled[cat] === false) continue;
    const keywords = await loadKeywordFile(cat);
    for (const kw of keywords) collected.push({ keyword: kw, category: cat });
  }
  for (const kw of custom) collected.push({ keyword: kw, category: "custom" });

  const truncated = collected.length > KEYWORD_RULE_ID_MAX_COUNT;
  if (truncated) {
    console.warn(
      `[kg-search-blocker] keyword count ${collected.length} exceeds budget ${KEYWORD_RULE_ID_MAX_COUNT}; truncating`
    );
  }
  const trimmed = collected.slice(0, KEYWORD_RULE_ID_MAX_COUNT);
  const addRules = trimmed
    .map((entry, i) => buildKeywordRule(entry.keyword, entry.category, i))
    .filter(Boolean);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: /** @type {chrome.declarativeNetRequest.Rule[]} */ (addRules),
  });
  return { count: addRules.length, truncated };
}

/**
 * Load a single keyword JSON file from the packaged data/ folder using
 * dynamic JSON module imports. This stays fully local (no outbound network)
 * and avoids fetch/XMLHttpRequest per the M6 privacy invariant.
 *
 * Returns [] gracefully if the file is missing (data subagent may not have
 * produced it yet during a Phase B parallel run) or if JSON modules are not
 * supported by the current Chrome build.
 * @param {string} category
 * @returns {Promise<string[]>}
 */
async function loadKeywordFile(category) {
  try {
    // Relative to background/search-blocker.js, the data/ folder lives one
    // level up at the extension root. Dynamic JSON module import is local;
    // Chrome resolves it from the bundled extension package only.
    const mod = await import(`../data/keywords/${category}.json`, {
      with: { type: "json" },
    });
    const json = mod && mod.default ? mod.default : mod;
    if (!json || !Array.isArray(json.patterns)) return [];
    return sanitizeKeywords(json.patterns);
  } catch (_e) {
    return [];
  }
}

/**
 * Build one redirect rule for one keyword. Returns null if keyword cannot
 * be encoded into a safe regex fragment.
 * @param {string} keyword
 * @param {string} category
 * @param {number} index
 * @returns {chrome.declarativeNetRequest.Rule | null}
 */
function buildKeywordRule(keyword, category, index) {
  const encoded = encodeKeywordForRegex(keyword);
  if (!encoded) return null;
  const regexFilter = `${SEARCH_ENGINE_HOSTS_REGEX_GROUP}/.*[?&](q|wd|word)=[^&]*${encoded}`;
  return {
    id: KEYWORD_RULE_ID_BASE + index,
    priority: PRIORITY_KEYWORD,
    action: {
      type: "redirect",
      redirect: {
        extensionPath: `/blocked/blocked.html?reason=keyword&category=${encodeURIComponent(category)}`,
      },
    },
    condition: {
      regexFilter,
      resourceTypes: ["main_frame"],
    },
  };
}

/**
 * Convert a human keyword (possibly Chinese) into a percent-encoded regex
 * fragment that matches the same word inside a URL query value. We escape
 * each percent-encoded byte's percent sign for declarativeNetRequest's
 * regex engine (RE2 syntax).
 * @param {string} keyword
 * @returns {string | null}
 */
function encodeKeywordForRegex(keyword) {
  const trimmed = String(keyword || "").trim();
  if (!trimmed) return null;
  // First URL-encode the whole keyword (this is what browsers send).
  const urlEncoded = encodeURIComponent(trimmed);
  // Then RE2-escape the result. Only %, +, ., *, ?, etc. are special; encodeURIComponent
  // already removed most. We escape regex metas conservatively.
  return urlEncoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Trim, dedupe and drop empty entries.
 * @param {string[]} list
 * @returns {string[]}
 */
function sanitizeKeywords(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const t = raw.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * @param {number} from
 * @param {number} to
 * @returns {number[]}
 */
function rangeIds(from, to) {
  const out = new Array(to - from + 1);
  for (let i = 0; i < out.length; i++) out[i] = from + i;
  return out;
}
