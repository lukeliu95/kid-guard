# kid-guard Module Contracts (Phase B)

This file is the SINGLE SOURCE OF TRUTH for cross-module interfaces.
All Phase B subagents (code / ui / data) MUST adhere to this. Any change
requires updating this file FIRST and re-syncing all consumers.

## 1. File layout

```
extension/
  manifest.json
  background/
    service-worker.js          # entry; imports from shared/ and feature modules
    blocker.js                 # kg-blocker: ruleset enable + dynamic rules
    schedule-lock.js           # kg-schedule-lock: alarm heartbeat + catch-all toggle
    search-blocker.js          # kg-search-blocker: dynamic redirect rules from keywords
    stats.js                   # kg-stats: declarativeNetRequestFeedback + webNavigation
  shared/
    pin-guard.js               # SHA256 hash, verify, unlock_until, cooldown
    storage.js                 # typed chrome.storage.local wrapper
    constants.js               # CATEGORY_IDS, RULESET_IDS, MSG_TYPES, STORAGE_KEYS
    messaging.js               # runtime.sendMessage helpers
  popup/        popup.html  popup.css  popup.js
  options/      options.html options.css options.js  tabs/*.js
  blocked/      blocked.html blocked.css blocked.js
  onboarding/   onboarding.html onboarding.css onboarding.js
  ruleset/      games.json adult.json social_short_video.json douyin_like.json
                gambling.json gacha_recharge.json vpn_proxy.json
                schedule_catchall.json keywords.json
  data/         keywords/{games,adult,social_short_video,douyin_like,gambling,gacha_recharge,vpn_proxy}.json
                quotes.json
  icons/        icon-16.png icon-32.png icon-48.png icon-128.png
  _locales/     zh_CN/messages.json  en/messages.json
```

## 2. Constants (shared/constants.js)

```js
export const CATEGORY_IDS = ["games","adult","social_short_video","douyin_like","gambling","gacha_recharge","vpn_proxy"];

// ruleset_id MUST equal CATEGORY_IDS entry (pattern-20260427-130200)
export const RULESET_IDS = CATEGORY_IDS;

export const STORAGE_KEYS = {
  pinHash:            "pin.hash.v1",
  pinSalt:            "pin.salt.v1",
  pinRecoveryQ:       "pin.recovery.q.v1",
  pinRecoveryAHash:   "pin.recovery.a.hash.v1",
  pinUnlockUntil:     "pin.unlock_until.v1",
  pinFailCount:       "pin.fail_count.v1",
  categoryEnabled:    "cat.enabled.v1",   // { games:true, adult:true, ... }
  customAllow:        "cat.allow.v1",     // string[] of hostnames
  customDeny:         "cat.deny.v1",      // string[] of hostnames
  schedule:           "schedule.v1",      // { enabled, windows:[{days:[1..7], from:"HH:MM", to:"HH:MM"}] }
  keywordsEnabled:    "keywords.enabled.v1",  // boolean
  keywordsCustom:     "keywords.custom.v1",   // string[]
  events:             "events.v1",        // { date:"YYYY-MM-DD", blocked:[{host,category,ts}], visited:[{host,ts}] }[] (last 14 days, capped)
  onboardingDone:     "onboarding.done.v1",
};

export const MSG_TYPES = {
  PIN_VERIFY:           "PIN_VERIFY",
  PIN_SETUP:            "PIN_SETUP",
  PIN_RECOVER:          "PIN_RECOVER",
  CATEGORY_TOGGLE:      "CATEGORY_TOGGLE",
  BLOCKLIST_UPDATE:     "BLOCKLIST_UPDATE",
  SCHEDULE_UPDATE:      "SCHEDULE_UPDATE",
  KEYWORDS_UPDATE:      "KEYWORDS_UPDATE",
  STATS_GET_TOP10:      "STATS_GET_TOP10",
  STATS_REPORT_NAV:     "STATS_REPORT_NAV",  // popup -> sw on visited (not used; we listen webNavigation)
};

export const PIN_COOLDOWN_MS = 30 * 1000;       // after 5 wrong attempts
export const PIN_UNLOCK_DURATION_MS = 5 * 60 * 1000;  // 5 min after correct PIN
export const ALARM_NAME_HEARTBEAT = "kg.heartbeat";
export const ALARM_PERIOD_MIN = 1;              // 60s heartbeat
export const SCHEDULE_RULE_ID = 9999;           // catch-all dynamic rule id
export const KEYWORD_RULE_ID_BASE = 10000;      // 10000..10100 reserved for keyword redirect rules
```

## 3. chrome.runtime.sendMessage protocol

All UI -> service worker calls go through:
```js
const reply = await chrome.runtime.sendMessage({ type: MSG_TYPES.PIN_VERIFY, payload: { pin: "1234" } });
// reply: { ok: true, data: {...} } or { ok: false, error: "..." }
```

| Type                  | Payload                                             | Reply data                                  |
|-----------------------|-----------------------------------------------------|---------------------------------------------|
| PIN_VERIFY            | `{ pin: string }`                                   | `{ unlocked: boolean, until: number }`      |
| PIN_SETUP             | `{ pin, recoveryQ, recoveryA }`                     | `{ ok: true }`                              |
| PIN_RECOVER           | `{ recoveryA, newPin }`                             | `{ ok: boolean }`                           |
| CATEGORY_TOGGLE       | `{ category: string, enabled: boolean }`            | `{ enabled }`                               |
| BLOCKLIST_UPDATE      | `{ allow?: string[], deny?: string[] }`             | `{ allow, deny }`                           |
| SCHEDULE_UPDATE       | `{ schedule }`                                      | `{ schedule }`                              |
| KEYWORDS_UPDATE       | `{ enabled?: boolean, custom?: string[] }`          | `{ enabled, custom }`                       |
| STATS_GET_TOP10       | `{ days?: 7, kind: "blocked" \| "visited" }`        | `{ rows: [{host, count}] }`                 |

**PIN gate enforcement**: CATEGORY_TOGGLE / BLOCKLIST_UPDATE / SCHEDULE_UPDATE / KEYWORDS_UPDATE must check `pinUnlockUntil > Date.now()` server-side and reply `{ ok: false, error: "PIN_REQUIRED" }` if not. UI must NOT bypass.

## 4. Blocked page contract

`blocked.html` is the redirect target. The service worker MUST encode reason via querystring:

```
chrome-extension://<id>/blocked/blocked.html?reason=<r>&host=<h>&category=<c>
```

Where `reason` in: `category | manual_deny | schedule_lock | keyword`. `host` and `category` are optional context. blocked.js MUST manually escape these (pitfall-20260416 - do not rely on default sanitizer); use `textContent`, never `innerHTML`.

## 5. Ruleset JSON schema (declarativeNetRequest)

`extension/ruleset/<category>.json`:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "redirect", "redirect": { "extensionPath": "/blocked/blocked.html?reason=category&category=<cat>&host=<placeholder>" } },
    "condition": { "urlFilter": "||example-game.com^", "resourceTypes": ["main_frame"] }
  }
]
```

Constraints:
- `id` unique within file, 1..N (N <= 5000 per ruleset)
- `urlFilter` uses declarativeNetRequest match patterns. Use `||host^` for domain + subdomains.
- `resourceTypes` always `["main_frame"]` for top-frame block (avoid breaking embeds inside allowed sites).
- `priority` always 1 for category rules (manual deny uses 2, manual allow uses 3).

`schedule_catchall.json` placeholder (one rule that the service worker enables/disables dynamically):

```json
[
  {
    "id": 9999,
    "priority": 100,
    "action": { "type": "redirect", "redirect": { "extensionPath": "/blocked/blocked.html?reason=schedule_lock" } },
    "condition": { "urlFilter": "*", "resourceTypes": ["main_frame"], "excludedRequestDomains": [] }
  }
]
```

This ruleset is registered with `enabled: false` in manifest; toggled ON via updateEnabledRulesets at lock window enter.

## 6. Keywords JSON schema

`extension/data/keywords/<category>.json` (one file per category):

```json
{
  "category": "games",
  "patterns": [
    "下载 王者荣耀",
    "腾讯游戏",
    "steam 破解"
  ]
}
```

The service worker reads all enabled-category keyword files at startup, builds dynamic rules with regex from query string match (`condition.regexFilter` pattern). One rule per pattern, priority 50, redirect to blocked.html?reason=keyword.

## 7. Quotes JSON schema

`extension/data/quotes.json`:
```json
[
  { "id": 1, "text": "学习是给未来的自己存钱", "lang": "zh-CN" },
  { "id": 2, "text": "Now is the time to study; play time will come.", "lang": "en" }
]
```
Min 20 entries, mix of zh-CN and en.

## 8. Bundle size budgets (HARD RULES)

| Artifact                          | Max raw | Max gz |
|-----------------------------------|---------|--------|
| popup/popup.html+css+js           | 100 KB  | 30 KB  |
| options/* combined                | 200 KB  | 60 KB  |
| blocked/* combined                | 50 KB   | 15 KB  |
| onboarding/* combined             | 80 KB   | 25 KB  |
| background/service-worker bundle  | 50 KB   | 18 KB  |
| ruleset/*.json combined           | 250 KB  | 60 KB  |
| total extension zip               | 800 KB  | n/a    |

If exceeded, escalate to orchestrator before phase end.

## 9. Privacy invariants (M6)

- ZERO outbound network requests from any module. Verify at the end with a test that loads the extension and runs `chrome.webRequest.onBeforeRequest` for any non-blocked.html resource - count must be 0 for kid-guard origin.
- All storage local-only (`chrome.storage.local`).
- PIN stored as `SHA256(salt + pin)` only; salt stored separately. Recovery answer same.

## 10. Build script contract

A single bash file `build.sh` at extension root:
- copies all source to `dist/`
- runs `esbuild` on every JS file (no bundling, just minify + treeshake)
- zips `dist/` to `kid-guard.zip`
- prints sizes vs budgets table
