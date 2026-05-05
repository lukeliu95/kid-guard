// kg-stats: 14-day rolling buffer of "blocked" and "visited" events,
// stored locally only. Used by popup TOP10 view and options overview tab.

import * as storage from "../shared/storage.js";
import {
  STORAGE_KEYS,
  EVENTS_RETENTION_DAYS,
  EVENTS_DAILY_CAP_PER_KIND,
} from "../shared/constants.js";

/**
 * @typedef {{ host: string, category?: string, ts: number }} BlockedEvent
 * @typedef {{ host: string, ts: number }} VisitedEvent
 * @typedef {{
 *   date: string,
 *   blocked: BlockedEvent[],
 *   visited: VisitedEvent[],
 * }} DayBucket
 */

/**
 * Record a blocked event into today's bucket.
 * @param {{ host: string, category?: string }} entry
 * @returns {Promise<void>}
 */
export async function recordBlocked(entry) {
  const host = sanitizeHost(entry && entry.host);
  if (!host) return;
  const category = typeof entry.category === "string" ? entry.category : "";
  const today = todayKey();
  const buckets = await loadBuckets();
  const bucket = ensureBucket(buckets, today);
  bucket.blocked.push({ host, category, ts: Date.now() });
  if (bucket.blocked.length > EVENTS_DAILY_CAP_PER_KIND) {
    bucket.blocked.splice(0, bucket.blocked.length - EVENTS_DAILY_CAP_PER_KIND);
  }
  await saveBuckets(prune(buckets));
}

/**
 * Record a top-frame navigation into today's bucket.
 * @param {{ host: string }} entry
 * @returns {Promise<void>}
 */
export async function recordVisited(entry) {
  const host = sanitizeHost(entry && entry.host);
  if (!host) return;
  const today = todayKey();
  const buckets = await loadBuckets();
  const bucket = ensureBucket(buckets, today);
  bucket.visited.push({ host, ts: Date.now() });
  if (bucket.visited.length > EVENTS_DAILY_CAP_PER_KIND) {
    bucket.visited.splice(0, bucket.visited.length - EVENTS_DAILY_CAP_PER_KIND);
  }
  await saveBuckets(prune(buckets));
}

/**
 * Aggregate the last N days into a TOP10 list.
 * @param {{ days?: number, kind: "blocked" | "visited" }} params
 * @returns {Promise<{ rows: { host: string, count: number }[] }>}
 */
export async function getTop10({ days = 7, kind } = { kind: "blocked" }) {
  if (kind !== "blocked" && kind !== "visited") {
    throw new Error("INVALID_KIND");
  }
  const cutoff = startOfDayKey(daysAgo(days - 1));
  const buckets = await loadBuckets();
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const bucket of buckets) {
    if (bucket.date < cutoff) continue;
    const list = kind === "blocked" ? bucket.blocked : bucket.visited;
    for (const ev of list) {
      counts.set(ev.host, (counts.get(ev.host) || 0) + 1);
    }
  }
  const rows = Array.from(counts.entries())
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { rows };
}

/**
 * @returns {Promise<DayBucket[]>}
 */
async function loadBuckets() {
  const raw = await storage.get(STORAGE_KEYS.events, []);
  if (!Array.isArray(raw)) return [];
  /** @type {DayBucket[]} */
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if (typeof item.date !== "string") continue;
    out.push({
      date: item.date,
      blocked: Array.isArray(item.blocked) ? item.blocked : [],
      visited: Array.isArray(item.visited) ? item.visited : [],
    });
  }
  return out;
}

/**
 * @param {DayBucket[]} buckets
 * @returns {Promise<void>}
 */
async function saveBuckets(buckets) {
  await storage.set(STORAGE_KEYS.events, buckets);
}

/**
 * @param {DayBucket[]} buckets
 * @param {string} date
 * @returns {DayBucket}
 */
function ensureBucket(buckets, date) {
  for (const b of buckets) if (b.date === date) return b;
  const fresh = { date, blocked: [], visited: [] };
  buckets.push(fresh);
  return fresh;
}

/**
 * Drop buckets older than retention window. Sorted ascending by date.
 * @param {DayBucket[]} buckets
 * @returns {DayBucket[]}
 */
function prune(buckets) {
  const cutoff = startOfDayKey(daysAgo(EVENTS_RETENTION_DAYS - 1));
  return buckets.filter((b) => b.date >= cutoff).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * @param {unknown} input
 * @returns {string}
 */
function sanitizeHost(input) {
  if (typeof input !== "string") return "";
  const t = input.trim().toLowerCase();
  if (!t) return "";
  // Drop port and userinfo just in case.
  return t.split(":", 1)[0];
}

/**
 * @returns {string} YYYY-MM-DD for today (local time)
 */
function todayKey() {
  return startOfDayKey(new Date());
}

/**
 * @param {Date} d
 * @returns {string}
 */
function startOfDayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {number} n
 * @returns {Date}
 */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
