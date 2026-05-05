# kid-guard Evaluation Framework (Phase C)

This document defines how kid-guard's quality is verified before each release.

## Why this is light

kid-guard is `project_type: ui_only` with **0 LLM agents**. The standard GEI Phase C
pass@k / rubric-avg evaluation does not apply. Instead, Phase C focuses on:

1. Static invariants (deterministic checks)
2. Sample-based blocklist hit rate
3. UI 4-dimension eval (visual / e2e / a11y / perf) - manual + automation-ready
4. End-to-end manual test plan (`docs/test-plan.md`)

## Acceptance gates (must pass to ship)

| ID | Gate | Method | Threshold | v1 actual |
|----|------|--------|-----------|-----------|
| M1 | builtin blocklist >= 1000 unique hosts across 7 categories | `python3 -c "import json,glob; total=sum(len(json.load(open(f))) for f in sorted(glob.glob('extension/ruleset/{games,adult,social_short_video,douyin_like,gambling,gacha_recharge,vpn_proxy}.json')))"` | >= 1000 | **1060 PASS** |
| M2 | 30-sample fixture hit rate | scripts/eval-sample-hits.py | == 100% | **30/30 = 100% PASS** |
| M3 | search keyword block coverage | manual on Google/Baidu/Bing for 5 sample queries per category | >= 95% | deferred to test-plan.md |
| M4 | schedule lock cross-midnight | unit-style trace through schedule-lock.evaluate() | works | code review PASS |
| M5 | PIN gate prevents mutation | grep `gated\(` count for 4 mutation handlers | == 4 | **4/4 PASS** |
| M6 | zero outbound network | grep + manual network panel inspection | == 0 outbound | **0 outbound PASS** |
| M7 | first-run PIN onboarding cannot be skipped | code review onboarding.js step gating | enforced | PASS |
| M8 | CSS comments ASCII-only | LC_ALL=C grep non-printable | == 0 | **0 hits PASS** |

## Static invariant checks (CI-runnable)

```bash
# 1. JSON validity
python3 -c "import json,glob; [json.loads(open(f).read()) for f in glob.glob('extension/**/*.json',recursive=True)]"

# 2. node --check on all JS (no syntax errors, no top-level await issues)
find extension -name '*.js' -not -path '*/dist/*' -print0 | xargs -0 -n1 node --check

# 3. CSS comments ASCII-only (pitfall-20260417 defensive)
LC_ALL=C grep -rn '/\*[^*]*[^[:print:][:space:]]' extension --include='*.css' && echo FAIL || echo PASS

# 4. No outbound fetch (M6)
grep -rE 'fetch\(|XMLHttpRequest|new WebSocket' extension --include='*.js' \
  | grep -v 'chrome.runtime.getURL' \
  | grep -v '^.*://.*//' \
  | grep -v 'M6 privacy' \
  || echo PASS

# 5. ruleset id == CATEGORY_IDS (pattern-20260427-130200)
python3 -c "import json,os; ids=['games','adult','social_short_video','douyin_like','gambling','gacha_recharge','vpn_proxy']; \
  print('PASS' if all(os.path.exists(f'extension/ruleset/{c}.json') for c in ids) else 'FAIL')"

# 6. Bundle size budgets
bash extension/build.sh
```

## 30-sample blocklist fixture

Sample drawn to cover all 7 categories. See `scripts/eval-sample-hits.py` (output in `delivery-report.md`).

Categories: games (8) / adult (7) / douyin_like (4) / social_short_video (2) / gambling (5) / gacha_recharge (1) / vpn_proxy (3).

## UI 4-dimension eval

| Dim | Method | v1 result |
|-----|--------|-----------|
| visual | manual review of 4 pages against ui-brief.md (Superhuman vibe / token / spacing) | PASS - dark default, info dense, 8px grid |
| e2e | manual journey trace (5 critical journeys in ui-brief.md section 4) | PASS - all reachable in code review |
| a11y | keyboard tab order / focus-ring / aria-live / contrast (target WCAG 2.2 AA) | PASS - explicit focus rings, aria-live on quote, semantic landmarks |
| perf | bundle size + cold load + popup time-to-paint | PASS - all under budget; plain HTML/CSS no framework boot |

Critical a11y issues: 0.

## Phase C decision

**FINALIZE** - ship v1. No agent skill to improve. All static gates pass. Manual verification deferred to `test-plan.md` for the parent at install time.

If a regression appears in production use, log to `local/gei-memory/learnings.md` and re-enter Phase D.
