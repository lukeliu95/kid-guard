---
round: 000
type: baseline
project: kid-guard
customer: kid-guard
project_type: ui_only
phase_d_entry_at: 2026-05-05T03:43:37Z
git_sha_at_entry: 61c8713b94b4db593395f4cd48bac161c898b0ea
output_dir: /Users/lukeliu/Sparticle/GEI-Agent/output/kid-guard
---

# Round 000 · kid-guard · Phase D Baseline Snapshot

## 1. 入口动机

用户原话:
> "GEI产品更新:初始设置时,不要全部显示卡片,需要一页一页显示进行设置.要屏蔽内容可以进行修改.只有家长可以修改."

解读: 用户希望把 onboarding 从当前的"PIN + 退出问题"两步极简向导,扩展为多步分页向导(逐页设置:启用哪些分类 / 自定义屏蔽 / 时段配置等),把现在挤在 options 5-tab 里的"成片卡片"前移到首次安装流程里。同时强化 PIN 守门 — 黑名单只有家长可改,kid 模式下 read-only。核心目标:把"父母面对 5 tab 不知从哪下手"的认知负担从 options 转移到逐步引导式 onboarding。

## 2. 起始评分(供 round-NNN 算 score delta 用)

```yaml
M1: PASS         # builtin blocklist >= 1000 unique hosts -> 1060
M2: PASS         # 30-sample fixture hit rate -> 30/30 (100%)
M3: DEFERRED     # search keyword block >= 95% -> manual at parent install
M4: PASS         # schedule lock cross-midnight -> code review PASS
M5: PASS         # PIN gate on 4 mutation handlers -> 4/4 gated()
M6: PASS         # zero outbound network -> 0
M7: PASS         # first-run PIN cannot be skipped -> enforced
M8: PASS         # CSS comments ASCII-only -> 0 hits
bundle_total_kb: 376
bundle_budget_kb: 800
zip_size_kb: 72
zip_budget_kb: 200
critical_issues: 0
gates_pass: 7
gates_deferred: 1
gates_total: 8
```

## 3. Phase C 余留问题

- **R-001 [OBSERVABILITY] M3 search keyword block 95% 阈值 manual deferred**
  rationale: 关键词命中本质是 regex 匹配,需在真实 Chrome 运行环境内对 Google/Baidu/Bing 实页验证;v1 deferred 给父母安装时按 test-plan.md 自测。非 FIXABLE — 不是代码缺陷,是验证策略选择。

- **R-002 [OBSERVABILITY] chrome://extensions 缝隙(MV3 限制不可绕)**
  rationale: MV3 不允许扩展阻止自己被禁用 / 删除。父母 PIN 保护"配置",不保护"扩展存在"。后续可加"被禁用本地通知"(系统级 alarm 持久化最后心跳时间)— 但根本性 MV3 限制本身 OBSERVABILITY,不是 fix。

- **R-003 [FIXABLE] icons 是占位 PNG**
  rationale: 当前 4 张 icon(16/32/48/128) 是 78-306 字节深蓝色填充占位。v1 自用足够,但上 Chrome Web Store 前必须替换为正式品牌设计。可在任何 Phase D round 用 gei-imagine 生成 + ImageMagick 切尺寸,FIXABLE。

- **R-004 [OBSERVABILITY] M3 95% 阈值未机器测试**
  rationale: 与 R-001 同根 — 关键词拦截阈值无 e2e 测试基础设施(无 Puppeteer / no headless Chrome with extension)。属于"验证基础设施缺口" OBSERVABILITY,非代码 FIXABLE。

## 4. 起始代码状态指纹

- git SHA: `61c8713b94b4db593395f4cd48bac161c898b0ea` (GEI 主仓 SHA · output/kid-guard 本身 gitignored,无独立 git)
- tests baseline: static gates: 8 acceptance gates / 7 PASS + 1 deferred (M3 manual)
- 关键文件清单:
  - `extension/manifest.json` — MV3 manifest, 7 ruleset rule_resources + dynamic
  - `extension/background/service-worker.js` — 总入口 + 4 个 mutation handler 走 `gated()`
  - `extension/background/{blocker,schedule-lock,search-blocker,stats}.js` — 4 模块
  - `extension/shared/{constants,storage,messaging,pin-guard}.js` — 共享层
  - `extension/onboarding/{onboarding.html,onboarding.js,onboarding.css}` — **本轮主战场**(当前两步:PIN + 退出问题)
  - `extension/options/{options.html,options.js,options.css}` — **本轮迁出源**(当前 5-tab 成片卡片)
  - `extension/popup/` `extension/blocked/` — 旁路,本轮不动
  - `extension/ruleset/*.json` — 7 类 1060 hosts,本轮不动
  - `extension/data/keywords/*.json` `extension/data/quotes.json` — 静态资产
  - `extension/build.sh` — bundle size 校验
  - `docs/{requirements-spec,decomposition-table,ui-brief,module-contracts}.md` — Phase A/B SOT,本轮如改 onboarding 流程需同步 module-contracts § PIN_GATE + onboarding 子章节
  - `pipeline-state.json` — Phase D 进入时 phase_status.product-evolution 由 "skipped" 切 "in_progress"

## 5. 本次进化的产品目标

把 onboarding 从两步极简向导(PIN + 退出问题)扩成多步分页向导,把"启用哪些分类 / 自定义屏蔽 / 时段配置"从 options 5-tab 前移到首次安装流程,逐页 next/back 推进。同时强化 PIN 守门:黑/白名单编辑、分类启停、时段配置 — 仅家长(PIN unlocked)可改;kid 状态下 options UI read-only(input disabled + 保存按钮灰)。退出当前"父母装完就甩 5 tab"的认知断崖,变成"装完即用、深入设置只在 onboarding 引导一次"。

## 6. 退出条件

- **本轮预计 1 round 完成**:onboarding 多页向导 + PIN read-only 守门是单一连贯改动,不需多轮迭代调参。
- **declare_stable_after_plateau_rounds**: N/A(不启用 plateau 检测,因为单 round)
- **max_rounds**: 1(从 pipeline-state confirmed_params.max_rounds=3 收紧到 1 — 本次进化范围明确边界清晰)
- **stop word**: 用户口头说 "稳定" / "可以了" / "OK" / "stable" 即终止
- **退出门**: round-001 通过验收(8 gates 不退化 + onboarding 多页流程手动走通 + options PIN read-only 验证)→ declare_stable
