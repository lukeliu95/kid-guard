// kg-schedule-lock: evaluates the user's schedule on every alarm tick and
// toggles a single catch-all dynamic rule that redirects all main-frame
// navigations to blocked.html?reason=schedule_lock during a lock window.
//
// Implementation choice (per module-contracts section 5): we use a dynamic
// rule with id = SCHEDULE_RULE_ID rather than the static schedule_catchall
// ruleset. Reason: dynamic rules give us per-tick precision without paying
// the static-ruleset enable round-trip cost, and the static ruleset stays
// available as a fallback (declared in manifest with enabled:false).

import * as storage from "../shared/storage.js";
import {
  STORAGE_KEYS,
  SCHEDULE_RULE_ID,
  PRIORITY_SCHEDULE,
  ALARM_NAME_HEARTBEAT,
  ALARM_PERIOD_MIN,
} from "../shared/constants.js";

/**
 * @typedef {{ days: number[], from: string, to: string }} ScheduleWindow
 * @typedef {{ enabled: boolean, windows: ScheduleWindow[] }} Schedule
 */

/**
 * @returns {Schedule}
 */
function defaultSchedule() {
  return { enabled: false, windows: [] };
}

/**
 * Persist a schedule and immediately re-evaluate.
 * @param {Schedule} schedule
 * @returns {Promise<{ schedule: Schedule }>}
 */
export async function updateSchedule(schedule) {
  const normalized = normalizeSchedule(schedule);
  await storage.set(STORAGE_KEYS.schedule, normalized);
  await evaluate();
  return { schedule: normalized };
}

/**
 * Read the persisted schedule.
 * @returns {Promise<Schedule>}
 */
export async function getSchedule() {
  return /** @type {Schedule} */ (await storage.get(STORAGE_KEYS.schedule, defaultSchedule()));
}

/**
 * Evaluate "is now inside any window?" and toggle the catch-all rule.
 * @param {Date} [now]
 * @returns {Promise<{ active: boolean }>}
 */
export async function evaluate(now = new Date()) {
  const schedule = await getSchedule();
  const active = schedule.enabled && isInsideAnyWindow(now, schedule.windows);
  if (active) await enableLock();
  else await disableLock();
  return { active };
}

/**
 * Insert (or refresh) the schedule catch-all dynamic rule.
 * @returns {Promise<void>}
 */
export async function enableLock() {
  /** @type {chrome.declarativeNetRequest.Rule} */
  const rule = {
    id: SCHEDULE_RULE_ID,
    priority: PRIORITY_SCHEDULE,
    action: {
      type: "redirect",
      redirect: {
        extensionPath: "/blocked/blocked.html?reason=schedule_lock",
      },
    },
    condition: {
      urlFilter: "*",
      resourceTypes: ["main_frame"],
    },
  };
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [SCHEDULE_RULE_ID],
    addRules: [rule],
  });
}

/**
 * Remove the schedule catch-all dynamic rule (no-op if missing).
 * @returns {Promise<void>}
 */
export async function disableLock() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [SCHEDULE_RULE_ID],
    addRules: [],
  });
}

/**
 * Idempotent setup of the heartbeat alarm.
 * @returns {Promise<void>}
 */
export async function ensureHeartbeatAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME_HEARTBEAT);
  if (existing) return;
  await chrome.alarms.create(ALARM_NAME_HEARTBEAT, {
    periodInMinutes: ALARM_PERIOD_MIN,
  });
}

/**
 * Returns true if "now" falls in any of the configured windows. Handles
 * cross-midnight windows (to < from). days uses ISO weekday 1..7 (Mon=1, Sun=7).
 * @param {Date} now
 * @param {ScheduleWindow[]} windows
 * @returns {boolean}
 */
export function isInsideAnyWindow(now, windows) {
  for (const w of windows) {
    if (isInsideWindow(now, w)) return true;
  }
  return false;
}

/**
 * @param {Date} now
 * @param {ScheduleWindow} window
 */
function isInsideWindow(now, window) {
  const fromMin = parseHHMM(window.from);
  const toMin = parseHHMM(window.to);
  if (fromMin == null || toMin == null) return false;
  const isoToday = isoWeekday(now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  if (toMin > fromMin) {
    // Same-day window
    return window.days.includes(isoToday) && minutesNow >= fromMin && minutesNow < toMin;
  }
  if (toMin < fromMin) {
    // Cross-midnight: split into [from..24:00 today] + [00:00..to next day]
    if (window.days.includes(isoToday) && minutesNow >= fromMin) return true;
    const yesterday = isoWeekday(addDays(now, -1));
    if (window.days.includes(yesterday) && minutesNow < toMin) return true;
    return false;
  }
  // toMin == fromMin: zero-length window
  return false;
}

/**
 * @param {string} hhmm
 * @returns {number | null}
 */
function parseHHMM(hhmm) {
  if (typeof hhmm !== "string") return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * ISO weekday: Mon=1..Sun=7.
 * @param {Date} d
 * @returns {number}
 */
function isoWeekday(d) {
  const day = d.getDay(); // 0=Sun..6=Sat
  return day === 0 ? 7 : day;
}

/**
 * @param {Date} d
 * @param {number} delta
 * @returns {Date}
 */
function addDays(d, delta) {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + delta);
  return out;
}

/**
 * @param {Schedule} input
 * @returns {Schedule}
 */
function normalizeSchedule(input) {
  if (!input || typeof input !== "object") return defaultSchedule();
  const windows = Array.isArray(input.windows) ? input.windows : [];
  /** @type {ScheduleWindow[]} */
  const cleaned = [];
  for (const w of windows) {
    if (!w || typeof w !== "object") continue;
    if (parseHHMM(w.from) == null || parseHHMM(w.to) == null) continue;
    if (!Array.isArray(w.days)) continue;
    const days = Array.from(
      new Set(
        w.days
          .map((d) => Number(d))
          .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
      )
    ).sort();
    if (days.length === 0) continue;
    cleaned.push({ days, from: w.from, to: w.to });
  }
  return { enabled: Boolean(input.enabled), windows: cleaned };
}
