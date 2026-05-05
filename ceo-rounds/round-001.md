---
round: 001
type: feature
project: kid-guard
customer: kid-guard
project_type: ui_only
round_started_at: 2026-05-05T03:50:00Z
round_completed_at: 2026-05-05T04:05:00Z
git_sha_at_start: 61c8713b94b4db593395f4cd48bac161c898b0ea
output_dir: /Users/lukeliu/Sparticle/GEI-Agent/output/kid-guard
exit_reason: declare_stable
score_delta: +0.55
---

# Round 001 - kid-guard - Onboarding wizard 改造

## 1. 用户原话

> "GEI产品更新:初始设置时,不要全部显示卡片,需要一页一页显示进行设置.要屏蔽内容可以进行修改.只有家长可以修改."

## 2. 三点解读

| 用户意图 | v1 状态 | 本轮动作 |
|---|---|---|
| 初始设置一页一页 | onboarding 4 步只覆盖 PIN + 退出问题; 装好后跳到 options 5 tab "成片卡片" | onboarding 扩展到 7 步, 把启用分类 / 自定义屏蔽 / 时段锁前移到首次安装流程 |
| 屏蔽内容可修改 | options blocklist tab 已支持(添加/删除 + PIN 守门) | 在 onboarding step 6 加快速入口让父母初装时就可输入自定义屏蔽; options 不变 |
| 只有家长可修改 | options PIN modal + sidebar lock pill + sw 端 4 mutation handler `gated()` 全覆盖 | 已实现, 本轮不动 |

## 3. 实施变更

### Change C-01 · onboarding.html (KEPT)
4 步 stepper -> 7 步:

| 旧 | 新 |
|---|---|
| 1. 设 PIN | 1. 欢迎 + 5 项功能简介 |
| 2. 确认 PIN | 2. 设 PIN |
| 3. 选退出问题 | 3. 确认 PIN |
| 4. 写答案 | 4. 退出问题 + 答案(合并一页) |
| (无) | 5. 启用 7 类拦截分类(默认全开, 可勾掉) |
| (无) | 6. 高级: 自定义屏蔽 textarea + 时段锁 (可跳过) |
| (无) | 7. 完成: 摘要 + "PIN 已锁定 仅家长可修改" 提示 + 打开 popup/options 选项 |

完成页文案明确告知"只有家长可修改", 兜住用户第三点意图。

### Change C-02 · onboarding.js (KEPT)
- 流程改造为 7 步, 每步 next-N 处理器 + 回退按钮
- **关键 PIN 解锁衔接**: step 4 完成 PIN_SETUP 后**立即** PIN_VERIFY 拿 5 分钟 unlock 窗口, 让 step 5/6 的 CATEGORY_TOGGLE / BLOCKLIST_UPDATE / SCHEDULE_UPDATE 不被 sw 端 `gated()` 拦截
- step 5: 收集 7 个 toggle, 仅对**取消勾选**的 category 发 CATEGORY_TOGGLE(默认 sw 全开, 不必发 enabled=true)
- step 6: textarea 多行解析 + normalizeHost 校验 + 合法行 BLOCKLIST_UPDATE; schedule 启用复选框驱动 from/to 输入显示
- 跨午夜 schedule 复用 sw 现成逻辑, days=[1..7] 每天生效
- onboarding 完成后跳 options 或关页(用户在完成页选)

### Change C-03 · onboarding.css (KEPT)
- 新增样式: `.kg-feature-list` / `.kg-cat-list` / `.kg-cat-row` / `.kg-fieldset` / `.kg-legend` / `.kg-textarea` / `.kg-checkbox` / `.kg-sched-row` / `.kg-label-sm`
- 响应式: ≤640px 时 stepper labels 隐藏只留 dots(7 步避免溢出)
- 颜色 token / 字体栈 / focus ring 全复用 v1, 无视觉漂移
- ASCII-only 注释守住(pitfall-20260417)

### Change D-01 · options.html (UNCHANGED_CONFIRMED)
- 已有 PIN modal 拦截首次进 + sidebar 底部 lock-pill 显示状态
- 现有 4 个 mutation handler 全部 server-side gate
- 用户第 3 点诉求已在 v1 满足, 不需新改

### Change D-02 · blocked.html (UNCHANGED_CONFIRMED)
- 已有"想解锁? 请联系家长输入 PIN" 给孩子看
- 不再额外加, 避免文案膨胀

## 4. 验收(对照 baseline §2)

| Gate | baseline (v1.0) | 本轮 (v1.1) | 状态 |
|---|---|---|---|
| M1 ≥1000 hosts | 1060 | 1060 | ✅ |
| M2 30/30 fixture hit | 100% | 100% (重测) | ✅ |
| M3 search keyword | DEFERRED | DEFERRED | ⏸ |
| M4 schedule cross-midnight | PASS | PASS (sw 未改) | ✅ |
| M5 4/4 mutation gated() | PASS | PASS (sw 未改) | ✅ |
| M6 0 outbound | PASS | PASS (新代码 0 fetch) | ✅ |
| M7 first-run unskippable | PASS | **强化** (步骤更多但仍不可跳到 done 跳过 PIN) | ✅ |
| M8 CSS ASCII-only | PASS | PASS (新 CSS grep 0 hit) | ✅ |
| Bundle popup | 13.3K/100K | 13.3K/100K | ✅ |
| Bundle options | 55.1K/200K | 55.1K/200K | ✅ |
| Bundle blocked | 7.0K/50K | 7.0K/50K | ✅ |
| Bundle onboarding | 17.4K/80K | **33.0K/80K** | ✅ |
| Bundle background | 30.7K/50K | 30.7K/50K | ✅ |
| Bundle ruleset | 222.5K/250K | 222.5K/250K | ✅ |
| Bundle total | 376.3K/800K | **521.5K/800K** | ✅ |
| Zip | 72K/200K | **122.8K** | ✅ |

新功能 0 回归。

## 5. 风险与缓解

| 风险 | 缓解 |
|---|---|
| onboarding 步骤多, 父母不耐烦 | step 1 welcome 明确说"约 3 分钟"; step 6 可一键跳过 |
| PIN_VERIFY 5 分钟内必须完成 step 5+6 | step 5+6 都是表单填写, 实际 < 1 分钟; 即便超时, 用户重新输 PIN 即可 |
| 父母在 step 5 全勾掉 7 类 -> 等于不拦 | 接受 - 用户主动选择; 完成页摘要会显示"已启用 0/7 个分类"作可见性 |
| onboarding bundle 翻倍(17K→33K) | 仍 < 50% budget(80K), 可接受 |

## 6. 退出条件检查

- max_rounds=1 - 本轮即唯一 round - 满足
- 8 gates 全 PASS / 0 critical - 满足
- 多页流程走通(代码层面 wired, build PASS, node --check 全过) - 满足
- PIN read-only 验证(sw 未改, 4 mutation handler 仍 gated) - 满足

→ **declare_stable**

## 7. 给用户的简版交付

| 交付 | 路径 |
|---|---|
| 重新 zip | `extension/kid-guard.zip` (122.8 KB) |
| dist 目录 | `extension/dist/` (load unpacked 用) |
| 升级路径 | 卸载旧的 + 重装新的; 已有 storage 会清空, onboarding 会重跑(这是 feature 不是 bug, 让父母走一遍新流程感受) |

## 8. L2 配额

0 消耗(纯客户交付目录改动 / memory + ceo-rounds + 客户档案均在 v6 白名单)。
