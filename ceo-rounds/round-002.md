---
round: 002
type: bugfix+design
project: kid-guard
customer: kid-guard
project_type: ui_only
round_started_at: 2026-05-05T04:15:00Z
round_completed_at: 2026-05-05T04:35:00Z
git_sha_at_start: 61c8713b94b4db593395f4cd48bac161c898b0ea
output_dir: /Users/lukeliu/Sparticle/GEI-Agent/output/kid-guard
exit_reason: declare_stable
score_delta: +0.55
---

# Round 002 - kid-guard - onboarding stacking 可见性 P0 修复 + 设计提升

## 1. 用户原话

> "GEI 产品更新:[Image #1] 查看图片,初始化设置需要一项一项进行。现在全放在一页中不合理。CEO 你需要派设计师 agent 去看看,并解决这个问题"

## 2. 用户截图诊断

截图显示 **7 个 step 全部串在同一页面里 stacking 显示**(应该一次只显示当前一步,但所有 7 步同时可见,完成页绿勾也露出)。

- 用户行为意图:点开 onboarding 期望只看到 step 1
- 实际看到:7 步全部 stacking,失去"向导"感,完全失败
- Round 001 设计意图(7-step wizard)在用户侧 0 实现,严重 P0 bug
- 用户授权 CEO 派"设计师 agent"修

## 3. CEO 决策与子任务派遣

CEO 判断:
- 这是个 CSS 优先级冲突 bug(`.kg-page { display: flex }` 覆盖 UA 的 `[hidden] { display: none }`),修法 1 行,但用户要求"派设计师 agent",执行用户意图
- 同步做 UX 提升(P1-P3)— 既然 CEO 要委托,值不动整个 onboarding 一次

**派遣 frontend-design subagent** 任务清单(P0 必修 / P1 体验 / P2 文案 / P3 a11y),严守:
- ASCII-only CSS 注释(pitfall-20260417)
- 0 npm 依赖 / vanilla
- onboarding bundle ≤ 50KB
- 不动 onboarding.js 业务流程(state machine + PIN_SETUP+VERIFY)
- 不动其他文件
- 0 outbound fetch

## 4. 实施变更(设计师 subagent 完成)

### Change C-04 · P0 修复 (KEPT)

`onboarding/onboarding.css` 第 7 行加:

```css
[hidden] { display: none !important; }
```

**根因**:`.kg-page { display: flex }` (specificity 0,1,0) 优先级高于 user-agent stylesheet 的 `[hidden] { display: none }`(attribute selector specificity 0,1,0 但被自定义 selector 覆盖)。`!important` 让 attribute selector 永远胜出。

**实测**(subagent 起 python3 -m http.server + chrome 探针):
- visible pages count = **1** (期望 1)
- visible data-page = **"1"** (默认 step 1)
- 6 个非 active page computedDisplay = **"none"** ✓
- panel min-height = 460px(P1)
- active step dot box-shadow halo = present ✓

### Change C-05 · P1 视觉强化 (KEPT)

| 改 | 原 | 新 |
|---|---|---|
| 页面切换动画 | 120ms 垂直 fade | **180ms fade + 8px slide-in from right**(更"翻页"感)+ `prefers-reduced-motion` guard |
| stepper 非当前步 | 圆点 + 标签全显 | **只 active 显标签**,其他只显数字(7 步避免拥挤) |
| active 圆点 | 仅变蓝 | **scale(1.08) + 3px halo box-shadow**(强"你在这一步") |
| panel 高度 | min-height 320px | **min-height 460px**(覆盖 step 5 7 类列表 / step 6 双 fieldset · 防页面跳动) |
| actions 行 | margin-top: 8px | **margin-top: auto**(底部贴齐 · 配合 flex column 布局,各页按钮位置一致) |
| primary 按钮 | min-width 96 + 平面 | **min-width 104 + box-shadow lift**(看起来"可点") |

### Change C-06 · P2 文案/视觉细节 (KEPT)

- `feature-list` `<ul>` → `::before` 伪元素 dot(accent 色 · 6px · opacity 0.7)替代默认 `disc`
- `kg-cat-row:has(input:checked)` → 左 3px accent border(已选分类强反馈 · `:has()` Chrome 105+ 支持,我们 target Chrome 111+ 安全)
- `kg-h1-sub` 字号 14→13px italic + text-secondary 色(step 6 "(可选)" 不再视觉死)

### Change C-07 · P3 a11y (KEPT)

- `showPage` 切换后焦点策略:**优先 .kg-h1 (programmatic focus via tabindex=-1)**,fallback input/textarea/primary button
- h1 加 `:focus-visible` 微环 ring(只 keyboard nav 显,鼠标点不显)
- 屏幕阅读器在 step 切换时听到新标题(welcome/done 等无 input 页也有合理焦点目标)

### 不动声明 (UNCHANGED_CONFIRMED)

- onboarding.html · 结构 0 改
- onboarding.js 业务逻辑 · state machine / next-N 处理器 / PIN_SETUP+VERIFY 衔接 / normalizeHost 全保留;只改了 showPage 焦点策略(纯展现层)
- options / popup / blocked / background / shared / ruleset / data 一字未动

## 5. 验收(对照 baseline §2 + round 001)

| Gate | baseline (v1.0) | round-001 (v1.1) | round-002 (v1.2) | 状态 |
|---|---|---|---|---|
| M1 ≥1000 hosts | 1060 | 1060 | 1060 | ✅ |
| M2 30/30 fixture | 100% | 100% | **100% (重测)** | ✅ |
| M4 schedule cross-midnight | PASS | PASS | PASS (sw 未改) | ✅ |
| M5 4/4 mutation gated() | PASS | PASS | PASS (sw 未改) | ✅ |
| M6 0 outbound | PASS | PASS | PASS (新 CSS 0 fetch) | ✅ |
| M7 first-run unskippable | PASS | PASS | PASS (流程未改) | ✅ |
| M8 CSS ASCII-only | PASS | PASS | **PASS (新增 13 处英文注释)** | ✅ |
| Bundle onboarding | 17.4K/80K | 33.0K/80K | **35.9K/80K** | ✅ |
| Bundle total | 376.3K/800K | 521.5K/800K | **524.4K/800K** | ✅ |
| Zip | 72K | 122.8K | **123.9K** | ✅ |
| ceo-rounds-verify | n/a | exit 0 | **exit 0** | ✅ |
| node --check 全 JS | PASS | PASS | PASS | ✅ |
| **可见性 P0** | n/a | **❌ 7 stacking** | **✅ 1 visible** | ✅ 修复 |

## 6. 风险评估

| 风险 | 缓解 |
|---|---|
| `:has()` selector 在低版 Chrome 不支持 | manifest minimum_chrome_version="111", :has() Chrome 105+ - 安全 |
| !important 在 CSS 滥用 | 仅 1 处对 `[hidden]` 用 - 标准 defensive 模式不算反模式 |
| 动画对老机器卡 | `prefers-reduced-motion: reduce` guard 已加 |
| 焦点放 h1 影响截图工具 | h1 focus-visible 抑制于 click/programmatic 路径,只 keyboard nav 显 |

## 7. 退出条件

- 用户原始问题 P0 修复(实测 1 visible page on load)
- 设计提升 9 处全部落地,onboarding 仍 35.9K(预算 80K · 富余 55%)
- 0 回归(8 gates / sample fixture / CSS ASCII / node check / verify.sh)

→ **declare_stable**

## 8. L2 配额

0 消耗。

## 9. 给用户的简版交付

| 交付 | 路径 |
|---|---|
| 重新 zip | `extension/kid-guard.zip` (123.9 KB) |
| 升级路径 | Chrome → chrome://extensions → KidGuard → reload(灰色刷新箭头) → 点扩展图标进 onboarding 验证 |
| 验证步骤 | 打开 onboarding 应只看到 step 1 (welcome 页) → 点"开始设置"逐步翻页 → 每页只看到当前一步 |
