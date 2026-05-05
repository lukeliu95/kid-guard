# 目标发现访谈记录 — kid-guard

| 项目 | 值 |
|------|-----|
| 客户 | kid-guard(自用 · 父母给 12-15 岁初中孩子) |
| 项目代号 | kid-guard |
| 访谈日期 | 2026-05-05 |
| 参与者 | 父母(主决策 + 主操作者), GEI orchestrator |
| 访谈方式 | orchestrator 主会话 AskUserQuestion 多轮(子会话不可问 · pitfall-20260420) |
| 项目类型 | ui_only(纯 Chrome MV3 浏览器扩展, 无 LLM 后端) |

---

## 核心目标(优先级排序)

1. **[Goal-1] · 拦截**: 自动拦截孩子可能访问的游戏 / 成人 / 重度短视频 / 抖音类 / 赌博 / 抽卡充值 / VPN 代理类网站, 内置精选黑名单 ≥1000 域名分 7 类, 父母可手动补充 — 为什么重要: 现有 BlockSite 等扩展不内置中国大陆主流游戏/抽卡/短视频站, 父母自己拼名单成本极高且容易漏。
2. **[Goal-2] · 防绕过**: 首次启动强制设 4-6 位 PIN + 退出问题(防忘); 改名单 / 关闭分类需 PIN, 孩子打不开 chrome://extensions 也禁用不了规则核心 — 为什么重要: 现有产品 PIN 大多只保护"卸载", 不保护"改名单", 孩子最容易在父母不在时偷偷加白名单。
3. **[Goal-3] · 时段锁**: 父母可设置 schedule(按星期 + 时段, 如 22:00–次日 06:00), 期间一切网页拦截 — 为什么重要: 作息时间是中学生最重要的纪律, 一刀切比按域名拦更稳。
4. **[Goal-4] · 搜索关键词拦截**: 在 Google / Baidu / Bing 上, 检测搜索 query 含敏感词 → 重定向到拦截页, 不让结果列出 — 为什么重要: 即使域名拦了, 孩子也会在搜索结果页看到诱导缩略图与标题, 直接拦请求才彻底。
5. **[Goal-5] · 7 天本地报表**: popup 显示 7 天拦截 TOP10 + 访问 TOP10, 仅本地存 — 为什么重要: 父母周末抽 5 分钟看一眼即可, 不需要后台/云端就能掌握上网情况。
6. **[Goal-6] · 拦截体验**: 硬拦页面带励志语轮播, 不引导外站 — 为什么重要: 拦截页本身是产品的"教育界面", 应该温和、不刺激孩子绕过。

---

## 背景画像

- **组织/家庭背景**: 父母为 12-15 岁(初中)孩子家用电脑设防的私域工具, 不是企业级 MDM, 不是 SaaS, 不上 Chrome Web Store(v1)
- **谁会用**:
  - **父母**(管理员): 装扩展 / 设 PIN / 维护名单 / 设时段 / 看周报
  - **孩子**(被控对象 · 12-15 岁): 用浏览器, 想绕过, 不能改名单 / 不能关分类 / 不能改时段
- **目前怎么做**:
  - 用 BlockSite 自己拼名单, 漏的多, 维护成本高
  - 路由器 DNS 黑名单可设但不灵活, 孩子改 hosts 即可绕(虽然 12 岁段儿童多数不会, 但仍有风险)
  - 现有方案对"搜索关键词"和"时段锁"两块都没好工具

---

## 关键场景

| # | 角色 | 触发条件 | 期望结果 | 对应目标 |
|---|------|---------|---------|---------|
| 1 | 孩子 | 在 Chrome 输入 4399.com / 抖音.com / 类似游戏短视频域名 | 页面被硬拦, 显示励志语 | Goal-1, Goal-6 |
| 2 | 孩子 | 在 Google/Baidu/Bing 搜 "免费游戏下载" / 黄色关键词 | 搜索请求被拦, 跳到拦截页 | Goal-4 |
| 3 | 孩子 | 22:30 想偷偷开网页查作业 | 整个浏览器全网拦截, 显示"22:00–06:00 时段锁" | Goal-3 |
| 4 | 孩子 | 想去 chrome://extensions 关掉本扩展 | 关掉后域名仍被网络层拦(declarativeNetRequest static ruleset 即使扩展 disable 也部分有效),但实际 v1 我们接受"chrome://extensions 可禁用扩展"为已知缝隙(MV3 限制 + 用户可见 toggle), 通过 PIN+退出问题让父母及时发现 | Goal-2(部分) |
| 5 | 孩子 | 想在 options 页加白名单 / 关掉某分类 | options 页有 PIN 锁屏, PIN 错误 N 次冷却, 改不了 | Goal-2 |
| 6 | 父母 | 周日晚上花 3 分钟看孩子上周上网情况 | popup 显示 7 天拦截 TOP10 + 访问 TOP10, 数据全本地不外传 | Goal-5 |
| 7 | 父母 | 孩子说"老师让看 B 站某个视频学习" | 父母输 PIN → 临时白名单加 b 站 / 调整分类开关 | Goal-2(管理员路径) |
| 8 | 父母 | 首次安装扩展 | onboarding 强制设 4-6 位 PIN + 退出问题, 不可跳过 | Goal-2 |

---

## 约束与红线

- **绝对不能做**:
  - **不上传任何数据**(浏览历史 / 拦截事件 / PIN / 名单)到任何远程服务器(包括 GEI / Sparticle / Google Analytics) — 隐私零外传
  - 不引导孩子去外站(拦截页不能放"建议你去 XX 学习站"链接, v1 不要)
  - 不存 PIN 原文, 必须 SHA256(或更强)哈希
- **数据敏感度**: 高 — 涉及未成年人浏览数据, 全部 chrome.storage.local, 不发任何 telemetry / network call 至外部域
- **优先级排序**: 隐私 > 拦截覆盖率 > 防绕过强度 > UI 美观 > 性能(MV3 性能基线已经够了)
- **MV3 已知缝隙(可接受 v1)**:
  - chrome://extensions 用户可手动禁用扩展(MV3 无法阻止)
  - 隐身模式默认不加载扩展(可在 options 提醒父母:"勾选'在隐身模式下允许'")
  - declarativeNetRequest 静态 ruleset 上限(Chrome 当前为 30000 规则 / 单 ruleset 5000)
- **bundle size 红线**:
  - popup ≤ 100KB 压缩后
  - service worker ≤ 50KB
  - 默认黑名单 JSON 体积 ≤ 200KB(精选 ≈1000 域名足够)

---

## 成功指标(用户自述 → 验收标准)

- **Goal-1 拦截**:
  - M1 · 内置 7 类黑名单 ≥ 1000 域名(精选不重复, 90%+ 在大陆 Alexa Top 5000 搜索得到)
  - M2 · 100% 拦截到测试 fixture 的 30 个 sample 域名
- **Goal-2 防绕过**:
  - M5 · 改名单 / 关闭分类不输 PIN 100% 阻止
  - M7 · 首次启动 PIN onboarding 不可跳过, PIN 字符串 SHA256 存(不存原文)
- **Goal-3 时段锁**:
  - M4 · 时段锁规则跨午夜 / 跨日仍工作
- **Goal-4 搜索关键词**:
  - M3 · Google / Baidu / Bing 三大引擎搜索关键词拦截率 ≥ 95%(基于测试集 50 个 query)
- **Goal-5 报表**:
  - M6 · popup 7 天数据全本地, network panel 看不到任何 outbound request 至外部域名
- **Goal-6 拦截体验**:
  - 拦截页带励志语轮播 ≥ 20 句, 随机/按时间切换
- **共通(质量)**:
  - M8 · CSS 注释 ASCII-only(避免 Tailwind v4 lightningcss 静默丢规则 · pitfall-20260417)
  - bundle size 三红线全过

---

## v1 范围决策(Step 0.1)

**判定**: ✅ 合理范围(单一业务域 · 浏览器扩展 · 7 大功能模块)

**v1 包含**:
- ✅ 域名拦截(子域名通配)
- ✅ 内置 7 类黑名单 + 默认拦截名单 JSON(精选 ≈1000 域名)
- ✅ 父母手动补名单(options 页 + PIN 守门)
- ✅ 时段锁
- ✅ 7 天访问/拦截报表(本地)
- ✅ 搜索关键词拦截(Google/Baidu/Bing)
- ✅ 首次安装强制设 PIN + 退出问题
- ✅ 拦截页(硬拦 + 励志语轮播)

**v1 不包含 → Phase D 候选**:
- ❌ 时间预算(每天 N 分钟)— 进 Phase D
- ❌ 重定向到学习资源 — 进 Phase D
- ❌ 卸载/禁用报警 — Phase D 待评估(v1 接受 chrome://extensions 缝隙)

**v1 永久不做(本项目宪法)**:
- ❌ 跨设备同步 / 云端策略(ui_only · 纯本地 · 隐私零外传)
- ❌ Chrome Web Store 上架 v1(unpacked 自用); v2 再考虑
- ❌ 任何外部 telemetry / Google Analytics(不同于 GEI 网站默认装 GA 的规则 · 因为本项目是个人隐私工具)

---

## 方向探索决策(Step 0.2)

### 决策点 1 · 拦截技术路径

**已选方向**: declarativeNetRequest 静态 ruleset(主) + 动态 rules(搜索关键词)

| 方向 | 优点 | 缺点 | 选择 |
|---|---|---|---|
| A · webRequestBlocking | 灵活 / 可写复杂逻辑 | MV3 已废, 仅企业 ESR 可用 | ❌ |
| **B · declarativeNetRequest** | **MV3 标准 / 性能好 / 静态 ruleset 即使扩展 disable 仍部分生效(Chrome ≥ 113)** | **复杂逻辑受限 / 单 ruleset 5000 规则上限** | **✅ 选** |
| C · content script DOM 拦截 | 实现简单 | 网络请求已发出, 隐私漏 / 易被绕 | ❌ |

**理由**: MV3 强制 + 静态 ruleset 是父母的护城河。

### 决策点 2 · 拦截 UX 风格

**已选方向**: 硬拦 + 励志语轮播(不引导外站)

| 方向 | 优点 | 缺点 | 选择 |
|---|---|---|---|
| A · 硬拦黑屏 | 最简单 | 孩子不知道为什么被拦, 容易反复试 | ❌ |
| **B · 硬拦 + 励志语轮播** | **温和 / 教育性 / 不刺激** | **需要准备 ≥ 20 句励志语** | **✅ 选** |
| C · 重定向到学习资源 | 教育转化最强 | v1 复杂度高 + 父母担心引到外站 | ❌(进 Phase D) |

### 决策点 3 · PIN 设置时机

**已选方向**: 首次启动强制设, onboarding 不可跳过

| 方向 | 优点 | 缺点 | 选择 |
|---|---|---|---|
| A · 默认无 PIN, 用户自愿设 | 友好 | 多数家庭忘记设 = 防绕过失效 | ❌ |
| **B · 首次启动强制设 + 退出问题** | **100% 覆盖 / 防忘** | **新手第一次稍麻烦** | **✅ 选** |

### 决策点 4 · 数据存储

**已选方向**: chrome.storage.local 全部本地, 0 外传

| 方向 | 优点 | 缺点 | 选择 |
|---|---|---|---|
| A · chrome.storage.sync(跨设备同步) | 父母多设备方便 | 数据走 Google · 隐私顾虑 | ❌ |
| **B · chrome.storage.local 仅本地** | **隐私零外传 / 简单** | **多设备需各自配置** | **✅ 选** |

---

## 已检索的 gei-memory 经验(top 5 · 注入到本访谈思考过程, 不读给用户)

| ID | 严重度 | 内容 | 在本项目的应用 |
|---|---|---|---|
| pitfall-20260417 | HIGH | Tailwind v4 + lightningcss CSS 注释含中文/em-dash 静默丢规则 | popup/options/blocked CSS 注释强制 ASCII-only(M8) |
| pitfall-20260415 | HIGH(applied 5) | mock-live schema drift | blocklist fixture(测试用)与 declarativeNetRequest rules 共用 type 定义(同 schema) |
| pitfall-20260416 | HIGH | 3rd-party default sanitizer shadowing | 拦截页若展示原始 URL 摘要, 显式 opt-out 默认 sanitizer |
| pattern-20260427-130200 | medium | schema enum = impl set | blocklist 分类 enum(7 类)必须对齐 declarativeNetRequest 实际加载的 ruleset_id, 避免 silent miss |
| pattern-20260427-130400 | medium | MV3 bundle size 极敏感 | < 20 个图标用 inline SVG, 不装 lucide-react |

---

## 范围决策(Step 0.1 总结)

- **判定**: ✅ 合理范围 — 7 大功能模块, 单一业务域(浏览器扩展), 单一用户群(父母 + 孩子)
- **本次交付范围**: 上述 v1 列表全部 7 个功能 + 1 套 onboarding + 4 个 HTML route(popup / options / blocked / onboarding)
- **后续子项目**: 无(同一交付内)
- **拆分理由**: N/A — 项目本身就是单子项目级别
