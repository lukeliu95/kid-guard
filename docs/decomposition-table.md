# kid-guard 需求分解表(Step 3)

| 项目 | 值 |
|---|---|
| 客户 | kid-guard |
| 项目类型 | ui_only(Chrome MV3 浏览器扩展) |
| 总需求数 | 18 条(REQ-A01 ~ REQ-G05) |
| Skill 候选数 | 13(7 Script + 5 UI + 1 数据资产) |
| 知识库需求数 | 3(K-01/02/03) |
| 生成日期 | 2026-05-05 |

---

## 1. 类型分布概览

| 类型 | 数量 | 在 ui_only 项目中的合理性 |
|---|---|---|
| **Agent**(LLM 推理) | **0** | ✅ 合理 — 本项目无自然语言理解 / 创意生成需求, 全部是规则匹配/数据存取/UI 渲染。0 Agent 是预期。|
| **Script**(纯代码) | 7 | declarativeNetRequest 规则 / chrome.storage 持久化 / SHA256 PIN / schedule 计算 / 拦截事件采集 / 关键词匹配 / DOM 渲染 |
| **Hybrid** | 0 | ✅ 合理 — 无理解 + 操作混合需求 |
| **UI**(纯视觉/交互, 无 LLM) | 5 | popup / options / blocked / onboarding / 励志语数据资产 |
| **UI-Agent-Hybrid** | 0 | ✅ 合理 — 无 chat / agent 输入承载需求 |

**结论**: 0 Agent skill 在本 ui_only 项目中是预期分布, 无需 LLM, 全部 ship 到客户后离线工作。

---

## 2. 已有 Skill 库扫描(Step 3a)

扫描 `~/.claude/plugins/*/skills/*/SKILL.md` + `<repo>/skills/*/SKILL.md`:

| 已有 Skill | 来源 | 匹配 REQ | 复用方式 |
|---|---|---|---|
| frontend-design | plugin:frontend-design | REQ-G01, G02, G03, G04 | **直接调用** — 给 4 个 HTML page 出 UI 草稿(B.1 UI subagent 用 ui-brief.md) |
| (无 LLM/Agent skill 匹配) | — | — | 因本项目 0 Agent |
| context7 | plugin:context7 | (B 阶段查 chrome.declarativeNetRequest API 文档时) | 间接参考 |

**结论**: UI 部分由 frontend-design 主导, Script 部分新写(MV3 API 较具体, 无现成可复用)。

---

## 3. 模块化分解(R-* 编号 ↔ Skill 名 ↔ 实现类型)

### 模块 A · 拦截引擎(Blocking Engine)

| R-# | REQ | 名称 | 实现类型 | Skill 名 | 已有复用 | 备注 |
|---|---|---|---|---|---|---|
| R-01 | REQ-A01 | 域名/子域名通配拦截 | **Script** | `kg-blocker` | 无 | declarativeNetRequest static ruleset |
| R-02 | REQ-A02 | 内置 7 类黑名单 ≥1000 域名 | **Script**(数据资产) | `kg-blocker`(同 skill, 数据子目录) | 无 | 7 个 ruleset JSON |
| R-03 | REQ-A03 | 父母手动补名单(白/黑) | **Script** | `kg-blocker` | 无 | declarativeNetRequest dynamic rules |

### 模块 B · 防绕过(PIN)

| R-# | REQ | 名称 | 实现类型 | Skill 名 | 已有复用 | 备注 |
|---|---|---|---|---|---|---|
| R-04 | REQ-B01 | 首次安装强制 PIN onboarding | **Script** | `kg-pin-guard` | 无 | SubtleCrypto SHA256 + chrome.storage.local |
| R-05 | REQ-B02 | PIN 守门改名单/关分类 | **Script** | `kg-pin-guard` | 无 | 5min unlock_until + 错误冷却 |
| R-06 | REQ-B03 | 退出问题找回 PIN | **Script** | `kg-pin-guard` | 无 | SHA256 比对 |

### 模块 C · 时段锁(Schedule)

| R-# | REQ | 名称 | 实现类型 | Skill 名 | 已有复用 | 备注 |
|---|---|---|---|---|---|---|
| R-07 | REQ-C01 | 父母配置 schedule | **Script** | `kg-schedule-lock` | 无 | chrome.storage 持久化 |
| R-08 | REQ-C02 | 时段锁评估与执行(跨午夜) | **Script** | `kg-schedule-lock` | 无 | chrome.alarms 60s 心跳 + dynamic rule toggle |

### 模块 D · 搜索关键词

| R-# | REQ | 名称 | 实现类型 | Skill 名 | 已有复用 | 备注 |
|---|---|---|---|---|---|---|
| R-09 | REQ-D01 | Google/Baidu/Bing query 关键词检测 | **Script** | `kg-search-blocker` | 无 | declarativeNetRequest dynamic rules + regexFilter |

### 模块 E · 7 天报表

| R-# | REQ | 名称 | 实现类型 | Skill 名 | 已有复用 | 备注 |
|---|---|---|---|---|---|---|
| R-10 | REQ-E01 | 拦截事件本地记录 | **Script** | `kg-stats` | 无 | declarativeNetRequestFeedback(unpacked) → events 表 |
| R-11 | REQ-E02 | 访问事件采样记录 | **Script** | `kg-stats` | 无 | webNavigation.onCommitted, top-frame only |
| R-12 | REQ-E03 | popup 7 天 TOP10 渲染 | **Script** | `kg-stats`(数据计算) + `kg-popup-ui`(渲染) | 无 + frontend-design | 数据 + UI 拆 |

### 模块 F · 拦截页

| R-# | REQ | 名称 | 实现类型 | Skill 名 | 已有复用 | 备注 |
|---|---|---|---|---|---|---|
| R-13 | REQ-F01 | 硬拦页 + 励志语轮播 | **Script**(逻辑) + **UI** | `kg-blocked-ui`(UI) | frontend-design | UI 渲染 + 1 个轮播脚本 |

### 模块 G · UI Pages

| R-# | REQ | 名称 | 实现类型 | Skill 名 | 已有复用 | 备注 |
|---|---|---|---|---|---|---|
| R-14 | REQ-G01 | blocked.html | **UI** | `kg-blocked-ui` | frontend-design | 同 R-13 |
| R-15 | REQ-G02 | options.html(5 tab) | **UI** | `kg-options-ui` | frontend-design | 最大 UI 工程 |
| R-16 | REQ-G03 | popup.html | **UI** | `kg-popup-ui` | frontend-design | 同 R-12 |
| R-17 | REQ-G04 | onboarding.html | **UI** | `kg-onboarding-ui` | frontend-design | 强制流 UI |
| R-18 | REQ-G05 | 励志语库 ≥20 句 | **数据资产**(JSON) | (随 kg-blocked-ui 打包) | 无 | quotes.json |

---

## 4. Skill 清单(给 Phase B 路由)

> 13 个最终 Skill / 资产模块, 1 个 ui-brief.md。

| # | Skill 名 | 类型 | REQ 覆盖 | 主要文件(预期) |
|---|---|---|---|---|
| 1 | `kg-blocker` | Script | A01, A02, A03 | background/blocker.js + ruleset/*.json × 7 |
| 2 | `kg-pin-guard` | Script | B01, B02, B03 | shared/pin-guard.js |
| 3 | `kg-schedule-lock` | Script | C01, C02 | background/schedule-lock.js |
| 4 | `kg-search-blocker` | Script | D01 | background/search-blocker.js + keywords.json |
| 5 | `kg-stats` | Script | E01, E02, E03(数据部分) | background/stats.js + shared/stats-query.js |
| 6 | `kg-popup-ui` | UI | E03(渲染), G03 | popup/popup.html + popup.css + popup.js |
| 7 | `kg-options-ui` | UI | A03(UI), B02(UI), C01(UI), D01(UI · 关键词管理), G02 | options/options.html + tabs/* |
| 8 | `kg-blocked-ui` | UI | F01, G01, G05 | blocked/blocked.html + quotes.json |
| 9 | `kg-onboarding-ui` | UI | B01(UI), G04 | onboarding/onboarding.html |
| 10 | `kg-manifest` | Script(配置资产) | (整合 manifest.json) | manifest.json + icons/ |
| 11 | (K-01) seed-blocklist | 数据资产 | A02 | ruleset/{games,adult,...}.json × 7 |
| 12 | (K-02) keywords | 数据资产 | D01 | keywords/{games,adult,...}.json |
| 13 | (K-03) quotes | 数据资产 | G05 | quotes.json |

> Phase B 实施时, "Skill" 在本项目=代码模块(MV3 扩展无 SKILL.md 概念), 但仍保持 1 模块 1 SKILL-equivalent 文档(`docs/modules/{name}.md`)的纪律。

---

## 5. 类型分流决策树验证(Step 3c)

对每条需求逐一过决策树:

| REQ | Q1 理解/判断/创造? | Q2 数据结构固定? | Q3 同时需理解+操作? | 类型 |
|-----|---|---|---|---|
| A01-A03 | 否(规则匹配) | 是(URL/JSON) | — | Script |
| B01-B03 | 否(SHA256/比对) | 是(string) | — | Script |
| C01-C02 | 否(时间计算) | 是(schedule JSON) | — | Script |
| D01 | 否(regex 匹配) | 是(URL/keywords JSON) | — | Script |
| E01-E03 | 否(SQL-like 聚合) | 是(events/visits 表) | — | Script |
| F01 | 否(模板渲染) | 是(quotes JSON) | — | Script |
| G01-G05 | 否(UI 视觉/交互) | 是(DOM) | — | UI |

**结论**: 0 处需 Agent 推理 → 0 个 Agent skill。本项目 100% 落在 Script + UI + 数据资产, 完全在 ui_only 类型下合理。

---

## 6. 知识库需求(Step 3d)

| K-# | 名称 | 来源 | 体积上限 | Phase B 责任 |
|---|---|---|---|---|
| K-01 | 7 类黑名单种子 ≥1000 域名 | 精选 + 大陆 Alexa Top 5000 调研 + AI 辅助查 | ≤200KB(总) | Phase B 单独的 "数据采集" 子任务 |
| K-02 | 搜索关键词敏感词 ≥100 词 × 7 类 | 精选 | ≤50KB | Phase B 同上 |
| K-03 | 励志语 ≥20 句 | 教育性中性 | ≤10KB | Phase B 撰写 |

---

## 7. UI Brief 决策(Step 3.3, 因 project_type=ui_only 必跑)

### 7.1 视觉参考(待 Step 3.3 用户选)

候选(orchestrator Step 3.3 阶段呈现, 本子会话不能 AskUserQuestion):
- **superhuman**(简洁 / 信息密度高 / 适合工具型扩展) — 推荐 popup / options
- **opencode.ai**(开发者风 / 暗色友好) — 备选
- 父母可贴外部 URL(如 1Password / Notion 风格)

### 7.2 组件清单

| Page | 主要组件 |
|---|---|
| popup | header(图标+扩展名) + 7 天数据卡片(2 个 TOP10) + 时段状态 banner + "进 options" 按钮 |
| options | sidebar(5 tab nav) + content area(每 tab 独立 form) + PIN 锁屏 modal |
| blocked | 大字号"已拦截"标题 + 分类标签 + hostname/query 摘要 + 励志语卡片 + (无外站链接) |
| onboarding | 多步表单(stepper) PIN→确认 PIN→退出问题→答案→完成 |

### 7.3 用户旅程(关键 5 条)

1. **首次安装** — load unpacked → 自动打开 onboarding → 设 PIN(2 次)+ 退出问题+答案 → 完成 → popup 可用
2. **孩子访问被拦域名** — Chrome 输入 → declarativeNetRequest 命中 → 跳 blocked.html → 显示分类+励志语
3. **孩子搜敏感词** — Google 搜索 → URL 命中关键词 regex → 跳 blocked.html
4. **孩子进 22:00–06:00 时段** — service worker 心跳启用 catch-all rule → 任何网页跳 blocked.html?reason=schedule_lock
5. **父母周末看周报** — 点工具栏图标 → popup 显示 TOP10 拦截/访问 → 点"进 options" → 输 PIN → 改名单/调时段

### 7.4 Stack 决策(待 Step 3.3 用户选)

候选:
- **Vanilla HTML/CSS/JS**(推荐 — bundle size 红线极严, 无依赖最稳) — 默认推荐
- React + Vite(若可控小到 ≤100KB)
- Vue / Astro(过 overkill)

> 本表决策稍后 Step 3.3 由 orchestrator 主会话与用户确认; 本 Worker 暂记"推荐 Vanilla", 不固定。

---

## 8. 风险与缓解

| 风险 | 严重度 | 缓解 |
|---|---|---|
| Bundle size 超 100KB | HIGH | Vanilla stack 默认 + inline SVG icons(pattern-20260427-130400) |
| Tailwind v4 CSS 注释丢规则 | HIGH | 不用 Tailwind, 或用 vanilla CSS; 若必须 Tailwind 则 CSS 注释强制 ASCII-only(pitfall-20260417 · M8) |
| declarativeNetRequest 静态 rules 总数超上限(30000) | medium | 7 类总 ≤ 5000 即可(单 ruleset 上限 5000) |
| 拦截页 sanitizer 默认行为吞 hostname | medium | 显式 opt-out + 自己 escape(pitfall-20260416) |
| K-01 黑名单维护成本 | medium | Phase B 用 AI 辅助 + 大陆 Alexa Top 5000 自动筛, 可接受 ~1000 精选 |
| MV3 chrome://extensions 缝隙 | LOW(已接受) | v1 接受; Phase D 评估"扩展被禁用本地通知" |

---

## 9. Phase B 启动建议

按优先级建议 Phase B 实施顺序(依赖关系):

```
1. kg-manifest(整合 manifest.json + icons + 项目骨架)
2. K-01/K-02/K-03 数据资产(并行 · 黑名单/关键词/励志语)
3. kg-blocker(基础拦截能力 · 依赖 K-01)
4. kg-pin-guard(防绕过基础设施 · 被多个 UI 依赖)
5. kg-schedule-lock(依赖 kg-blocker 的 dynamic rules 路径)
6. kg-search-blocker(依赖 K-02)
7. kg-stats(依赖 kg-blocker 的拦截事件)
8. UI 4 件套(blocked / onboarding / popup / options · 依赖前述全部) + ui-brief.md 在 Step 3.3 完成
```

---

## 10. 用户确认入口(Step 3 末)

> 本 Worker(子会话)不能 AskUserQuestion, 由 orchestrator 主会话在 Step 3.5 用户评审门统一向用户确认:
>
> 1. 18 条 REQ 类型分类是否同意(0 Agent / 12 Script / 5 UI · 1 数据资产)
> 2. 13 个 Skill 模块切分是否合理
> 3. K-01/02/03 知识库范围是否同意
> 4. Stack(Vanilla 推荐 vs React)选择
> 5. 视觉参考(superhuman 推荐 vs opencode.ai 备选 vs 自备)选择
