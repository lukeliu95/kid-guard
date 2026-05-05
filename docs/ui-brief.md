# kid-guard UI Brief (Step 3.3)

| Field | Value |
|---|---|
| project_type | ui_only |
| stack | **Vanilla HTML / CSS / JS** (zero-dep, MV3 bundle red-line friendly) |
| build | esbuild for JS minify only; no framework runtime |
| visual_reference | **Superhuman style** (clean, dense info, cool tone, tool-grade) |
| design_tokens | inline CSS custom properties (no Tailwind to avoid pitfall-20260417) |
| icons | inline SVG (no lucide-react / icon font; per pattern-20260427-130400) |
| fonts | system stack (-apple-system, "Segoe UI", "PingFang SC", sans-serif) |
| target_pages | popup.html / options.html / blocked.html / onboarding.html |
| entry_size_budget | popup zip <= 100 KB / options zip <= 200 KB / sw <= 50 KB |
| accessibility | WCAG 2.2 AA target, lang=zh-CN, keyboard-first |
| i18n | zh-CN primary, en optional via _locales/ |

## 1. Visual Language (Superhuman-derived)

- **Palette** (light + dark dual mode, dark is default for tool-grade feel):
  - bg-primary: #0E0F12 (dark) / #FAFAFB (light)
  - bg-elevated: #16181D / #FFFFFF
  - text-primary: #ECEDEE / #0E0F12
  - text-secondary: #9BA0A8 / #5A6068
  - accent (primary action): #5E7CE2 (calm blue, not alarm)
  - danger (block / kid action): #E5484D
  - success (allowed / parent confirm): #46A758
  - border-subtle: #2A2D33 / #E5E7EB
- **Type scale**: 12 / 13 / 14 / 16 / 20 / 28 px; line-height 1.5
- **Density**: compact (Superhuman-like 8 px row gap; not airy Notion-like)
- **Motion**: 120 ms ease-out for hover, 180 ms for modals; no parallax / decorative animations
- **Iconography**: inline SVG, 16 / 20 px, stroke 1.5

## 2. Component Inventory

| Component | Used by | Notes |
|---|---|---|
| `<kg-header>` | popup, options, blocked, onboarding | 32px tall, brand mark left, status pill right |
| `<kg-stat-card>` | popup | TOP10 list with category icon + count badge |
| `<kg-tab-nav>` | options | sidebar 5 tabs vertical (blocklist / categories / schedule / keywords / pin) |
| `<kg-list-row>` | options blocklist tab | domain text + category select + delete icon |
| `<kg-toggle>` | options categories tab | category enable/disable, with ruleset_id label |
| `<kg-pin-modal>` | options | full-screen lock, 4-6 digit input, error cooldown |
| `<kg-quote-card>` | blocked | large motivational quote, no hyperlinks |
| `<kg-stepper>` | onboarding | 4 steps: PIN -> confirm -> recovery Q -> answer |
| `<kg-banner>` | popup | schedule-lock active state warning |

## 3. Page Wireframes (ASCII)

### 3.1 popup.html (360 x 480 px)

```
+------------------------------------+
| kg-header  KidGuard       [normal] |
+------------------------------------+
| schedule-lock banner (if active)   |
+------------------------------------+
| TOP10 Blocked (last 7 days)        |
|  1. example-game.com  ......  142  |
|  2. ...                            |
+------------------------------------+
| TOP10 Visited (last 7 days)        |
|  1. khanacademy.org   ......   98  |
|  2. ...                            |
+------------------------------------+
| [ open options ]                   |
+------------------------------------+
```

### 3.2 options.html (1080 x 720 px responsive)

```
+----------+----------------------------+
| sidebar  | content area               |
| - block  |                            |
| - cat    |   per-tab form             |
| - sched  |                            |
| - keys   |                            |
| - pin    |                            |
+----------+----------------------------+
```

PIN gate: full-screen modal first thing, 4-6 digit input + recovery question fallback.

### 3.3 blocked.html (full viewport)

```
+--------------------------------------+
|                                      |
|         [ category icon ]            |
|         Already blocked              |
|         category: games              |
|         host: example-game.com       |
|                                      |
|       <kg-quote-card>                |
|       "study now, play later"        |
|                                      |
|       (no external links)            |
|                                      |
+--------------------------------------+
```

NOTE: hostname/query rendering MUST opt-out of any 3rd-party default sanitizer (pitfall-20260416). Manual escape only.

### 3.4 onboarding.html (560 x 640 px modal page)

```
+----------------------------------+
| kg-stepper [1/4 PIN]             |
| Set 4-6 digit PIN                |
| [ * * * * * * ]                  |
| [ next ]                         |
+----------------------------------+
[2/4 confirm PIN] -> [3/4 recovery question] -> [4/4 answer] -> done
```

## 4. User Journeys (5 critical)

1. **First install** -> auto-open onboarding -> PIN x2 + recovery Q + A -> done -> popup usable.
2. **Kid hits a blocked domain** -> Chrome typed -> declarativeNetRequest match -> redirect to blocked.html -> show category + quote.
3. **Kid searches sensitive keyword** -> Google query -> URL matches keyword regex -> redirect to blocked.html?reason=keyword.
4. **Schedule-lock window (22:00 - 06:00)** -> service worker heartbeat enables catch-all dynamic rule -> any nav -> blocked.html?reason=schedule.
5. **Parent weekly review** -> click toolbar icon -> popup TOP10 -> open options -> PIN -> edit blocklist / schedule.

## 5. CSS Constraints (HARD RULES)

- **CSS comments must be ASCII-only** (pitfall-20260417). Even though we are not using Tailwind v4, this is a defensive rule - any future migration would inherit the bug. Add a pre-commit grep rule `git grep -n -P '/\*[^*]*[^\x00-\x7f]' "*.css"` to enforce.
- No CSS-in-JS / no styled-components - hand-written CSS only.
- Use logical properties for i18n readiness (`margin-inline-start`, etc.).
- Dark mode default; `prefers-color-scheme: light` overrides.

## 6. Accessibility Floor

- All interactive elements keyboard-reachable, visible focus ring (2 px outline + 2 px offset).
- Color contrast >= 4.5 : 1 for body text, 3 : 1 for large text and UI controls.
- ARIA labels on icon-only buttons.
- `<kg-pin-modal>` traps focus; ESC does NOT close (per safety policy).
- Motivational quote uses `role="status" aria-live="polite"` so kid screen-reader users hear the same message.

## 7. Non-goals (explicit)

- No login / no account.
- No theming UI (parent cannot pick palette in v1).
- No animation library.
- No external font loading.
- No analytics / telemetry.
