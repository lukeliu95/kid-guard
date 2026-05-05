// Shared constants. Single source of truth - mirror of module-contracts.md section 2.
// Pattern-20260427-130200: ruleset_id MUST equal CATEGORY_IDS entry.

export const CATEGORY_IDS = [
  "games",
  "adult",
  "social_short_video",
  "douyin_like",
  "gambling",
  "gacha_recharge",
  "vpn_proxy",
];

// ruleset_id MUST equal CATEGORY_IDS entry
export const RULESET_IDS = CATEGORY_IDS;

// Optional schedule catch-all ruleset id (not in CATEGORY_IDS - toggled by schedule-lock)
export const SCHEDULE_CATCHALL_RULESET_ID = "schedule_catchall";

export const STORAGE_KEYS = {
  pinHash: "pin.hash.v1",
  pinSalt: "pin.salt.v1",
  pinRecoveryQ: "pin.recovery.q.v1",
  pinRecoveryAHash: "pin.recovery.a.hash.v1",
  pinUnlockUntil: "pin.unlock_until.v1",
  pinFailCount: "pin.fail_count.v1",
  pinCooldownUntil: "pin.cooldown_until.v1",
  categoryEnabled: "cat.enabled.v1",
  customAllow: "cat.allow.v1",
  customDeny: "cat.deny.v1",
  schedule: "schedule.v1",
  keywordsEnabled: "keywords.enabled.v1",
  keywordsCustom: "keywords.custom.v1",
  events: "events.v1",
  onboardingDone: "onboarding.done.v1",
};

export const MSG_TYPES = {
  PIN_VERIFY: "PIN_VERIFY",
  PIN_SETUP: "PIN_SETUP",
  PIN_RECOVER: "PIN_RECOVER",
  CATEGORY_TOGGLE: "CATEGORY_TOGGLE",
  BLOCKLIST_UPDATE: "BLOCKLIST_UPDATE",
  SCHEDULE_UPDATE: "SCHEDULE_UPDATE",
  KEYWORDS_UPDATE: "KEYWORDS_UPDATE",
  STATS_GET_TOP10: "STATS_GET_TOP10",
  STATS_REPORT_NAV: "STATS_REPORT_NAV",
};

// Messages that mutate state and require an active PIN unlock.
export const PIN_GATED_TYPES = new Set([
  MSG_TYPES.CATEGORY_TOGGLE,
  MSG_TYPES.BLOCKLIST_UPDATE,
  MSG_TYPES.SCHEDULE_UPDATE,
  MSG_TYPES.KEYWORDS_UPDATE,
]);

export const PIN_COOLDOWN_MS = 30 * 1000;
export const PIN_UNLOCK_DURATION_MS = 5 * 60 * 1000;
export const PIN_MAX_ATTEMPTS_BEFORE_COOLDOWN = 5;

export const ALARM_NAME_HEARTBEAT = "kg.heartbeat";
export const ALARM_PERIOD_MIN = 1;

export const SCHEDULE_RULE_ID = 9999;
export const KEYWORD_RULE_ID_BASE = 10000;
export const KEYWORD_RULE_ID_MAX_COUNT = 100;

// Dynamic rule id range for custom allow/deny lists. Range 1..1000.
export const CUSTOM_RULE_ID_MIN = 1;
export const CUSTOM_RULE_ID_MAX = 1000;

// Priorities (per module-contracts.md section 5)
export const PRIORITY_CATEGORY = 1;
export const PRIORITY_DENY = 2;
export const PRIORITY_ALLOW = 3;
export const PRIORITY_KEYWORD = 50;
export const PRIORITY_SCHEDULE = 100;

// Events ring-buffer caps
export const EVENTS_RETENTION_DAYS = 14;
export const EVENTS_DAILY_CAP_PER_KIND = 5000;

// Search engine hosts used by keyword regex (kept in one place for unit-style reuse).
export const SEARCH_ENGINE_HOSTS_REGEX_GROUP =
  "(google\\.com|baidu\\.com|cn\\.bing\\.com|www\\.bing\\.com)";
