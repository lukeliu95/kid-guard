// Service worker entry. Wires lifecycle events, the heartbeat alarm, and the
// chrome.runtime.onMessage router used by every UI page.
//
// All write-type messages go through requirePinUnlocked() before the handler
// is invoked - the UI is untrusted and may attempt to bypass.

import * as storage from "../shared/storage.js";
import {
  STORAGE_KEYS,
  MSG_TYPES,
  PIN_GATED_TYPES,
  ALARM_NAME_HEARTBEAT,
} from "../shared/constants.js";
import { makeRouter } from "../shared/messaging.js";
import * as pin from "../shared/pin-guard.js";
import * as blocker from "./blocker.js";
import * as scheduleLock from "./schedule-lock.js";
import * as searchBlocker from "./search-blocker.js";
import * as stats from "./stats.js";

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  bootstrap().catch((err) => console.error("[kg] bootstrap onInstalled failed", err));
});

chrome.runtime.onStartup.addListener(() => {
  bootstrap().catch((err) => console.error("[kg] bootstrap onStartup failed", err));
});

/**
 * Idempotent first-run plumbing. Safe to call repeatedly.
 * @returns {Promise<void>}
 */
async function bootstrap() {
  await scheduleLock.ensureHeartbeatAlarm();
  await blocker.applyCategoryToggles();
  await blocker.refreshCustomListsFromStorage();
  await searchBlocker.refreshDynamicRules();
  await scheduleLock.evaluate();

  const onboardingDone = Boolean(await storage.get(STORAGE_KEYS.onboardingDone, false));
  const pinSet = await pin.isPinSet();
  if (!onboardingDone || !pinSet) {
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL("onboarding/onboarding.html") });
    } catch (_e) {
      // tabs.create may not be permitted in service-worker startup contexts;
      // the popup/options entry points will redirect to onboarding as a fallback.
    }
  }
}

// ---------------------------------------------------------------------------
// Heartbeat alarm
// ---------------------------------------------------------------------------

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME_HEARTBEAT) return;
  scheduleLock.evaluate().catch((err) => console.error("[kg] schedule evaluate failed", err));
});

// ---------------------------------------------------------------------------
// Block / nav telemetry (local only)
// ---------------------------------------------------------------------------

if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  // declarativeNetRequestFeedback is unpacked-only; guard so packed builds don't crash.
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    try {
      const url = info && info.request && info.request.url ? info.request.url : "";
      const host = url ? new URL(url).hostname : "";
      const category = inferCategoryFromRule(info && info.rule);
      stats.recordBlocked({ host, category }).catch(() => {});
    } catch (_e) {
      // Never let telemetry break navigation.
    }
  });
}

chrome.webNavigation.onCommitted.addListener((details) => {
  // Only top frames; do not record iframes/ads.
  if (details.frameId !== 0) return;
  try {
    const u = new URL(details.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    stats.recordVisited({ host: u.hostname }).catch(() => {});
  } catch (_e) {
    // Malformed URL - ignore.
  }
});

/**
 * @param {unknown} rule
 * @returns {string}
 */
function inferCategoryFromRule(rule) {
  if (!rule || typeof rule !== "object") return "";
  // declarativeNetRequest doesn't tell us the ruleset id reliably from
  // onRuleMatchedDebug across versions; we leave category empty and rely on
  // the rule's redirect URL to encode it for blocked.html. Best-effort.
  return "";
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

/**
 * Wrap a handler so it requires an active PIN unlock window.
 * @param {(payload: any) => Promise<unknown> | unknown} handler
 * @param {string} type
 */
function gated(handler, type) {
  return async (payload, sender) => {
    if (PIN_GATED_TYPES.has(type)) {
      await pin.requirePinUnlocked();
    }
    return handler(payload, sender);
  };
}

const router = makeRouter({
  [MSG_TYPES.PIN_VERIFY]: async (payload) => {
    const pinValue = payload && typeof payload.pin === "string" ? payload.pin : "";
    return pin.verify(pinValue);
  },
  [MSG_TYPES.PIN_SETUP]: async (payload) => {
    const hasPin = payload && typeof payload.pin === "string" && payload.pin.length > 0;
    const hasRecovery = payload && typeof payload.recoveryQ === "string" && typeof payload.recoveryA === "string";
    const alreadyConfigured = await pin.isPinSet();

    // Partial update path: when a PIN already exists and the caller supplies only one of
    // (pin) or (recoveryQ + recoveryA), update just that field and preserve the rest.
    if (alreadyConfigured && hasPin && !hasRecovery) {
      await pin.requirePinUnlocked();
      await pin.updatePin(payload.pin);
      return { ok: true };
    }
    if (alreadyConfigured && !hasPin && hasRecovery) {
      await pin.requirePinUnlocked();
      await pin.updateRecovery({ recoveryQ: payload.recoveryQ, recoveryA: payload.recoveryA });
      return { ok: true };
    }
    // Full setup path (onboarding or first-time): all three fields required.
    const pinValue = hasPin ? payload.pin : "";
    const recoveryQ = hasRecovery ? payload.recoveryQ : "";
    const recoveryA = hasRecovery ? payload.recoveryA : "";
    await pin.setPin({ pin: pinValue, recoveryQ, recoveryA });
    await storage.set(STORAGE_KEYS.onboardingDone, true);
    return { ok: true };
  },
  [MSG_TYPES.PIN_RECOVER]: async (payload) => {
    const recoveryA = payload && typeof payload.recoveryA === "string" ? payload.recoveryA : "";
    const newPin = payload && typeof payload.newPin === "string" ? payload.newPin : "";
    return pin.recover({ recoveryA, newPin });
  },
  [MSG_TYPES.CATEGORY_TOGGLE]: gated(async (payload) => {
    const category = payload && typeof payload.category === "string" ? payload.category : "";
    const enabled = Boolean(payload && payload.enabled);
    const result = await blocker.setCategoryEnabled(category, enabled);
    // Keyword rules may include this category - rebuild.
    await searchBlocker.refreshDynamicRules();
    return result;
  }, MSG_TYPES.CATEGORY_TOGGLE),
  [MSG_TYPES.BLOCKLIST_UPDATE]: gated(async (payload) => {
    return blocker.updateCustomLists({
      allow: payload && Array.isArray(payload.allow) ? payload.allow : undefined,
      deny: payload && Array.isArray(payload.deny) ? payload.deny : undefined,
    });
  }, MSG_TYPES.BLOCKLIST_UPDATE),
  [MSG_TYPES.SCHEDULE_UPDATE]: gated(async (payload) => {
    return scheduleLock.updateSchedule(payload && payload.schedule);
  }, MSG_TYPES.SCHEDULE_UPDATE),
  [MSG_TYPES.KEYWORDS_UPDATE]: gated(async (payload) => {
    return searchBlocker.updateKeywords({
      enabled: payload && typeof payload.enabled === "boolean" ? payload.enabled : undefined,
      custom: payload && Array.isArray(payload.custom) ? payload.custom : undefined,
    });
  }, MSG_TYPES.KEYWORDS_UPDATE),
  [MSG_TYPES.STATS_GET_TOP10]: async (payload) => {
    const days = payload && Number.isFinite(payload.days) ? Number(payload.days) : 7;
    const kind = payload && payload.kind === "visited" ? "visited" : "blocked";
    return stats.getTop10({ days, kind });
  },
  [MSG_TYPES.STATS_REPORT_NAV]: async () => {
    // No-op: top-frame navigations are captured via webNavigation.onCommitted.
    return { ok: true };
  },
});

chrome.runtime.onMessage.addListener(router);
