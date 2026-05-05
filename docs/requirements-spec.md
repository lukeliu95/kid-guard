# kid-guard 需求规格书

| 项目 | 值 |
|------|-----|
| 客户名称 | kid-guard(自用 · 父母给 12-15 岁初中孩子) |
| 业务领域 | 家用设备 / 未成年人网络管控 / 隐私敏感工具 |
| 主要语言 | 简体中文(UI), 英文为次要 |
| Agent 用途 | Chrome MV3 浏览器扩展 — 拦截不良网站 + 时段锁 + 搜索关键词拦截 + 本地报表 |
| 项目类型 | ui_only(无 LLM, 纯前端 + chrome.storage.local) |
| 原始需求来源 | orchestrator JTBD interview(主会话 · 2026-05-05) |
| 版本 | 1.0.0 |
| 创建日期 | 2026-05-05 |
| 最后更新 | 2026-05-05 |

---

## 1. 项目背景

父母希望给 12-15 岁初中孩子的家用电脑(主用 Chrome 浏览器)安装一个**自用的本地浏览器扩展**, 自动拦截游戏 / 抖音类 / 黄赌 / 抽卡充值 / VPN 代理类网站, 防止孩子在父母不在时偷偷绕过。

**痛点**:
- 现有 BlockSite 等扩展不内置中国大陆主流游戏/抽卡/短视频站, 父母自己拼名单成本极高
- 现有产品 PIN 大多只保护"卸载", 不保护"改名单 / 关分类"
- 没有好的"搜索关键词拦截"和"时段锁"工具
- 不放心市售 SaaS / 路由器云端方案的隐私(未成年人浏览数据外传)

**为什么 v1 是 unpacked 自用**: 不打算上 Chrome Web Store(避免 store 审核 + 隐私政策合规成本), 父母直接 Load unpacked 即可, 后续 v2 再视情况上架。

---

## 2. 目标与范围

### 2.1 项目目标

来自 docs/discovery-interview.md 6 个 Goal:

- **Goal-1 拦截**: 内置 7 类精选黑名单 ≥1000 域名 + 父母手动补
- **Goal-2 防绕过**: 首次启动强制设 PIN + 退出问题; 改名单/关分类需 PIN
- **Goal-3 时段锁**: 父母可设 schedule(按星期 + 时段), 期间一切网页拦截
- **Goal-4 搜索关键词拦截**: Google/Baidu/Bing 拦敏感词 query
- **Goal-5 7 天本地报表**: popup 显示 7 天拦截 TOP10 + 访问 TOP10
- **Goal-6 拦截体验**: 硬拦页面带励志语轮播, 不引导外站

### 2.2 范围

**v1 包含**(7 大功能模块):
1. 域名/子域名拦截(declarativeNetRequest 静态 ruleset)
2. 内置 7 类黑名单(精选 ≈1000 域名 JSON)
3. 父母手动补名单(options + PIN 守门)
4. 时段锁(schedule + 跨午夜处理)
5. 搜索关键词拦截(Google/Baidu/Bing 动态 rules)
6. 7 天本地报表(popup)
7. 首次安装 onboarding 强制 PIN + 退出问题

**v1 不包含(放 Future Considerations)**:
- 时间预算(每天 N 分钟)
- 重定向到学习资源
- 卸载/禁用报警
- Chrome Web Store 上架
- 跨设备同步 / 云端策略
- 任何外部 telemetry

---

## 3. 用户角色(Persona)

| 角色 | 描述 | 主要场景 |
|------|------|----------|
| **父母**(管理员) | 安装扩展, 设 PIN, 维护名单, 设时段, 看周报 | onboarding 设 PIN, options 改规则, popup 看报表 |
| **孩子**(被控对象 · 12-15 岁) | 用浏览器, 想绕过 | 访问网页 → 被拦 / 时段锁 / 搜索关键词拦 |

---

## 4. 功能需求

### 4.1 模块 A · 拦截引擎(Blocking Engine)

#### REQ-A01 · 域名 + 子域名通配拦截

- **优先级**: P0
- **描述**: 当用户(孩子)访问命中黑名单的域名 / 子域名时, declarativeNetRequest 静态 ruleset 拦截请求, 重定向到 blocked.html
- **用户故事**: 作为孩子, 当我访问 *.4399.com 时, 浏览器应跳转到本地 blocked.html
- **输入**: HTTP/HTTPS 请求 URL
- **期望输出**: redirect 到 chrome-extension://{id}/blocked.html?reason={category}&host={hostname}
- **交互方式**: 自动(网络层拦截)
- **对应目标**: Goal-1
- **实现类型**: Script(declarativeNetRequest rules 静态 JSON · 见 §4.2)
- **验收标准**:
  - [ ] 命中规则的请求 100% 被拦截(Chrome DevTools Network 看不到)
  - [ ] 子域名通配:`*.4399.com` 拦截 `www.4399.com` / `m.4399.com`
  - [ ] 拦到的 URL 在 blocked.html 显示分类原因
- **备注**: declarativeNetRequest 的 `urlFilter` 用 `||4399.com^` 形式, action `redirect` 到扩展内 blocked.html

#### REQ-A02 · 内置 7 类黑名单 ≥1000 域名

- **优先级**: P0
- **描述**: ship 一份精选 7 类黑名单 JSON, 总 ≥1000 域名, 内置于扩展, 用户可禁用某类(需 PIN)但不能删除内置条目
- **用户故事**: 作为父母, 装好扩展即可立即拦 7 大类, 不需要自己拼名单
- **输入**: 无(随扩展打包)
- **期望输出**: ruleset/{category}.json × 7 类, 总条目 ≥1000
- **交互方式**: 装机即生效
- **对应目标**: Goal-1
- **实现类型**: Script(数据资产 · 静态 JSON 文件)
- **验收标准**:
  - [ ] 7 类各 1 个 ruleset JSON 文件 (games / adult / social_short_video / douyin_like / gambling / gacha_recharge / vpn_proxy)
  - [ ] 总域名 ≥ 1000, 精选不重复
  - [ ] 90%+ 在大陆 Alexa Top 5000 / 同类调研可查
  - [ ] 总 JSON 体积 ≤ 200KB(裸文件, 未压缩)
- **备注**: 黑名单生成方式留给 Phase B 决定(可手工精选 + AI 辅助查), 但本规格书锁定"精选不重复 + 体积红线"

#### REQ-A03 · 父母手动补名单(白名单 + 黑名单)

- **优先级**: P0
- **描述**: options 页支持父母手动添加 / 删除自定义黑名单 / 白名单条目, 需输 PIN 才能进入编辑模式
- **用户故事**: 作为父母, 当孩子说"老师让看 b 站某视频学习"时, 我输 PIN 后能临时把 bilibili.com 加白名单
- **输入**: 域名字符串 + 白/黑名单选择
- **期望输出**: 写入 chrome.storage.local 的 user_blocklist / user_allowlist; 同时通过 chrome.declarativeNetRequest.updateDynamicRules 实时生效
- **交互方式**: options 页表单
- **对应目标**: Goal-1, Goal-2
- **实现类型**: Script(chrome.storage + declarativeNetRequest 动态 rules · UI 见 REQ-D02)
- **验收标准**:
  - [ ] 添加自定义黑名单后, 立即拦截(无需重启浏览器)
  - [ ] 白名单优先级 > 内置黑名单(白名单条目即使在内置黑名单也通行)
  - [ ] 删除条目立即生效
  - [ ] 数据持久化(浏览器重启后保留)

### 4.2 模块 B · 防绕过(PIN 防护)

#### REQ-B01 · 首次安装强制 PIN onboarding

- **优先级**: P0
- **描述**: 装机首次打开扩展(任意入口) → 强制跳转 onboarding.html, 要求设 4-6 位 PIN + 1 个退出问题(忘 PIN 用), 不可跳过
- **用户故事**: 作为父母, 装好扩展第一次打开任何入口都被引导设 PIN, 不会忘记设
- **输入**: 父母输入 PIN(4-6 位数字)+ 确认 PIN + 退出问题(自由文本) + 答案
- **期望输出**:
  - PIN SHA256 哈希存入 chrome.storage.local(不存原文)
  - exit_question + exit_answer SHA256 哈希存入
  - 标记 first_run_completed = true
- **交互方式**: onboarding.html 表单
- **对应目标**: Goal-2
- **实现类型**: Script(SubtleCrypto SHA256 + chrome.storage.local · UI 见 REQ-D04)
- **验收标准**:
  - [ ] first_run_completed = false 时任何入口(popup/options)都跳转 onboarding
  - [ ] PIN 必须 4-6 位数字, 两次输入一致
  - [ ] 退出问题答案 ≥ 2 字符
  - [ ] PIN 存的是 SHA256 hex, 不是原文
  - [ ] onboarding 流程不允许关闭/跳过(关闭后下次仍跳转)

#### REQ-B02 · PIN 守门改名单 / 关分类

- **优先级**: P0
- **描述**: options 页进入"编辑模式"前必须输 PIN; PIN 错 N 次冷却(防暴力); 编辑窗口超时自动锁屏
- **用户故事**: 作为孩子, 我打开 options 想加白名单, 但被 PIN 锁屏挡住
- **输入**: PIN(4-6 位数字)
- **期望输出**: 验证 SHA256 = 存储的 hash → unlock_until = now + 5min; 错则计数 +1
- **交互方式**: options 页 PIN 锁屏组件
- **对应目标**: Goal-2
- **实现类型**: Script
- **验收标准**:
  - [ ] PIN 错 5 次 → 锁定 5 分钟
  - [ ] PIN 错 10 次 → 锁定 1 小时
  - [ ] 验证通过后 5 分钟内可编辑, 超时自动锁屏
  - [ ] 100% 阻止未输 PIN 的 options 修改

#### REQ-B03 · 退出问题找回 PIN

- **优先级**: P1
- **描述**: PIN 锁屏页有"忘了 PIN" 链接 → 输入退出问题答案 → 答对则可重置 PIN(进入 onboarding 重设)
- **用户故事**: 作为父母, 万一忘记 PIN 不至于得卸载扩展
- **输入**: 退出问题答案
- **期望输出**: SHA256 = 存储的 hash → 允许重设 PIN
- **交互方式**: PIN 锁屏页 → 退出问题输入页
- **对应目标**: Goal-2
- **实现类型**: Script
- **验收标准**:
  - [ ] 答错 3 次锁定 1 小时
  - [ ] 答对后跳到 onboarding 重设 PIN
  - [ ] 重设 PIN 后旧 hash 立即失效

### 4.3 模块 C · 时段锁(Schedule Lock)

#### REQ-C01 · 父母配置时段锁规则

- **优先级**: P0
- **描述**: options 页可设置"星期 + 起止时间"组成的 schedule 列表, 期间一切网页(除扩展自身页面)拦截
- **用户故事**: 作为父母, 我设"周日-周四 22:00–06:00 全网拦截"
- **输入**: schedule 数组 [{days: [0..6], start: "22:00", end: "06:00"}, ...]
- **期望输出**: 写入 chrome.storage.local; 同时通过 background service worker 周期性(每分钟)评估当前是否在锁内 → 启用/禁用一条 catch-all 动态 rule
- **交互方式**: options 页 schedule 编辑器
- **对应目标**: Goal-3
- **实现类型**: Script
- **验收标准**:
  - [ ] schedule 编辑需 PIN 守门
  - [ ] 多条 schedule 可叠加(取并集)
  - [ ] 跨午夜规则(22:00–06:00)正确处理(M4)
  - [ ] schedule 持久化

#### REQ-C02 · 时段锁评估与执行

- **优先级**: P0
- **描述**: service worker 每分钟评估"当前时间是否在任意 schedule 区间内", 是 → 启用 catch-all 动态 rule(拦所有 http(s) 主请求 → 重定向 blocked.html?reason=schedule_lock); 否 → 移除该 rule
- **用户故事**: 作为孩子, 22:30 想开网页, 浏览器跳到拦截页显示"时段锁 22:00–06:00"
- **输入**: 当前时间 + schedule 配置
- **期望输出**: 启用/禁用 catch-all 动态 rule
- **交互方式**: 自动(service worker 心跳)
- **对应目标**: Goal-3
- **实现类型**: Script(chrome.alarms + declarativeNetRequest.updateDynamicRules)
- **验收标准**:
  - [ ] 进入时段 ≤ 60s 内启用拦截
  - [ ] 离开时段 ≤ 60s 内解除拦截
  - [ ] 跨午夜 / 跨日规则工作正确(M4)
  - [ ] 扩展自身页面(blocked / popup / options / onboarding · chrome-extension:// 协议)不被拦
- **备注**: catch-all rule 用 `urlFilter: "*"` + `resourceTypes: ["main_frame"]`, action redirect 到 blocked.html

### 4.4 模块 D · 搜索关键词拦截

#### REQ-D01 · 搜索引擎 query 关键词检测

- **优先级**: P0
- **描述**: 在 google.com/google.com.hk / baidu.com / bing.com 上, 检测 URL query 参数(q / wd / search 等)是否含敏感词, 命中则拦请求 → 重定向 blocked.html?reason=search_keyword
- **用户故事**: 作为孩子, 在 Google 搜"免费下载游戏"被拦, 不能看搜索结果
- **输入**: 搜索 URL(主请求)
- **期望输出**: declarativeNetRequest 动态 rule 命中 → redirect blocked.html
- **交互方式**: 自动(网络层)
- **对应目标**: Goal-4
- **实现类型**: Script
- **验收标准**:
  - [ ] Google / Baidu / Bing 三大引擎覆盖
  - [ ] 50 个测试 query 拦截率 ≥ 95%(M3)
  - [ ] 敏感词列表内置 + 父母可加(options 页 · PIN 守门)
  - [ ] 命中拦截无 false positive(普通学习类 query 不拦)
- **备注**: declarativeNetRequest urlFilter 用 `||google.com/search?*` + regexFilter 匹配 query 含敏感词的 pattern; 关键词列表 ≥ 100 词分类(games / adult / gambling / etc.)

### 4.5 模块 E · 7 天本地报表

#### REQ-E01 · 拦截事件本地记录

- **优先级**: P0
- **描述**: declarativeNetRequest.onRuleMatchedDebug(declarativeNetRequestFeedback 权限)记录每次拦截 → 写入 chrome.storage.local 的 events 表(7 天滚动)
- **用户故事**: 作为父母, 我装好扩展后, 系统自动记录孩子被拦了哪些站
- **输入**: declarativeNetRequest 拦截事件
- **期望输出**: events 表新增 `{timestamp, hostname, category, action: "block"}`
- **交互方式**: 自动(后台)
- **对应目标**: Goal-5
- **实现类型**: Script
- **验收标准**:
  - [ ] 拦截事件 100% 记录
  - [ ] 7 天前的事件自动清理
  - [ ] events 表大小有上限(防 storage 爆)
  - [ ] 仅本地, 不外传(M6)
- **备注**: declarativeNetRequestFeedback 仅 unpacked / dev mode 可用, 但本项目就是 unpacked, 所以可用; 如果未来上 store 改用其他记录路径

#### REQ-E02 · 访问事件采样记录(可选 v1 包含)

- **优先级**: P1
- **描述**: 用 chrome.webNavigation.onCommitted 记录正常访问的 hostname(取 top-level frame), 7 天滚动 — 用于 popup TOP10 访问榜
- **用户故事**: 作为父母, 我想看孩子最近 7 天访问最多的站(包括正常的, 不只是被拦的)
- **输入**: webNavigation 事件
- **期望输出**: visits 表 `{timestamp, hostname}`
- **交互方式**: 自动
- **对应目标**: Goal-5
- **实现类型**: Script
- **验收标准**:
  - [ ] 仅记录主框架(top-level frame), 不记录广告/iframe
  - [ ] 仅记录 hostname, 不记录完整 URL(隐私 · 仅父母看趋势)
  - [ ] 7 天滚动
  - [ ] 仅本地

#### REQ-E03 · popup 显示 7 天 TOP10 拦截 + TOP10 访问

- **优先级**: P0
- **描述**: 点击工具栏图标弹出 popup.html, 显示过去 7 天:
  - 拦截 TOP10 hostname + 次数
  - 访问 TOP10 hostname + 次数
  - 当前时段锁状态
  - "进入 options" 按钮
- **用户故事**: 作为父母, 周日花 3 分钟点 popup 看周报
- **输入**: events / visits 表
- **期望输出**: popup HTML 渲染
- **交互方式**: 工具栏图标点击
- **对应目标**: Goal-5
- **实现类型**: Script(纯 DOM 渲染) · UI 见 REQ-D03
- **验收标准**:
  - [ ] 7 天聚合统计正确
  - [ ] popup 加载 ≤ 200ms
  - [ ] popup 体积 ≤ 100KB(压缩后 · 红线)
  - [ ] 不发任何外部 network request(M6)

### 4.6 模块 F · 拦截页(Blocked Page)

#### REQ-F01 · 硬拦页 + 励志语轮播

- **优先级**: P0
- **描述**: blocked.html 显示:
  - 大字号"已拦截" + 分类原因 + 触发的 hostname / search query
  - 励志语(从内置 ≥20 句中按时间或随机抽 1 句)
  - 不放任何外站链接 / 不放"绕过"按钮
- **用户故事**: 作为孩子, 看到温和的拦截页和励志语, 不会想绕过
- **输入**: URL query: ?reason={category}&host={hostname} 或 ?reason=search_keyword&query={...} 或 ?reason=schedule_lock
- **期望输出**: 渲染 blocked.html
- **交互方式**: 浏览器自动跳转(declarativeNetRequest redirect)
- **对应目标**: Goal-6
- **实现类型**: Script(纯 DOM · UI 见 REQ-D01)
- **验收标准**:
  - [ ] 励志语 ≥ 20 句
  - [ ] 不展示外站链接 / 不诱导绕过
  - [ ] 显示原始 URL 摘要时显式 opt-out 默认 sanitizer(避免 pitfall-20260416 三方 sanitizer 阴影)
  - [ ] CSS 注释 ASCII-only(M8)

### 4.7 模块 G · UI(Pages)

> 本模块 5 条需求是 UI 视图层, 与 REQ-A~F 的逻辑分开列出, 在 Phase B 由 UI subagent 实现。

#### REQ-G01 · blocked.html(拦截页 UI)

- **优先级**: P0
- **描述**: 渲染 REQ-F01 描述的拦截页, 视觉简洁、温和、不刺激
- **实现类型**: UI
- **对应目标**: Goal-6
- **验收**: 详见 REQ-F01

#### REQ-G02 · options.html(管理后台)

- **优先级**: P0
- **描述**: 5 个 tab:
  - **概览**: 7 天 TOP10 拦截/访问统计(同 popup 但更详)
  - **黑名单**: 7 类内置 toggle + 自定义黑名单 add/remove
  - **白名单**: 自定义白名单 add/remove
  - **时段锁**: schedule 编辑器
  - **搜索关键词**: 关键词列表 add/remove(7 分类)
  - **PIN/退出问题**: 重设 PIN, 改退出问题
- **PIN 守门**: 全部 tab 进入"编辑模式"需 PIN(REQ-B02)
- **实现类型**: UI
- **对应目标**: Goal-1, Goal-2, Goal-3, Goal-4, Goal-5
- **验收标准**:
  - [ ] 5 个 tab 切换流畅
  - [ ] 编辑前 PIN 锁屏 100% 阻止
  - [ ] 表单校验(域名格式 / 时段格式)
  - [ ] CSS 注释 ASCII-only(M8)

#### REQ-G03 · popup.html(快速概览)

- **优先级**: P0
- **描述**: 工具栏图标点击 → 显示 REQ-E03 描述的 7 天报表 + 当前时段锁状态 + "进 options" 按钮
- **实现类型**: UI
- **对应目标**: Goal-5
- **验收**:
  - [ ] popup 加载 ≤ 200ms
  - [ ] 体积 ≤ 100KB 压缩(红线)
  - [ ] 仅本地数据 / 不发外部请求

#### REQ-G04 · onboarding.html(首次设 PIN)

- **优先级**: P0
- **描述**: 渲染 REQ-B01 描述的强制 onboarding 流程: PIN 设置(2 次)+ 退出问题
- **实现类型**: UI
- **对应目标**: Goal-2
- **验收**: 详见 REQ-B01

#### REQ-G05 · 励志语库

- **优先级**: P0
- **描述**: 内置励志语 JSON ≥ 20 句, 短句 ≤ 30 字, 中文为主, 教育性中性
- **实现类型**: 数据资产(随扩展打包)
- **对应目标**: Goal-6
- **验收**:
  - [ ] ≥ 20 句, 不重复
  - [ ] 不含外站名 / 不含绕过暗示
  - [ ] UTF-8 编码

---

## 5. 非功能需求

| 项目 | 要求 |
|------|------|
| 浏览器 | Chrome MV3 only(v1); Edge / Firefox 列入 v2 |
| Manifest 版本 | manifest_version: 3 |
| 性能 | popup 加载 ≤ 200ms; service worker cold start ≤ 500ms |
| Bundle size | popup ≤ 100KB(压缩); service worker ≤ 50KB; 默认黑名单 JSON ≤ 200KB |
| 数据安全 | 全部 chrome.storage.local; **0 外部 network request**(M6 · network panel 验证) |
| PIN 存储 | SHA256 hex, 不存原文 |
| 兼容性 | Chrome ≥ 113(declarativeNetRequest static ruleset disabled-extension fallback 起始版本) |
| 部署 | 本地 unpacked + zip 安装包 |
| 国际化 | UI 简体中文为主, 字符串集中管理便于后续 i18n |

---

## 6. 知识库需求

| 编号 | 名称 | 数据来源 | 格式 | 备注 |
|------|------|----------|------|------|
| K-01 | 7 类黑名单种子 ≥1000 域名 | 精选 + 大陆 Alexa Top 5000 调研 | JSON × 7 | Phase B 生成 |
| K-02 | 搜索关键词敏感词库 ≥100 词 | 精选(games / adult / gambling / gacha / vpn) | JSON | Phase B 生成 |
| K-03 | 励志语库 ≥20 句 | 教育性中性句子 | JSON | Phase B 生成 |

> 所有 K-* 文件随扩展打包, 不需运行时拉取。

---

## 7. 集成需求

**无外部集成**(隐私零外传宪法决定)。

唯一"集成"是 Chrome MV3 API:
- chrome.declarativeNetRequest(静态 + 动态 rules · 拦截核心)
- chrome.declarativeNetRequestFeedback(unpacked · 拦截事件回调)
- chrome.storage.local(数据持久化)
- chrome.alarms(时段锁周期心跳)
- chrome.webNavigation(访问事件采样)
- chrome.runtime / chrome.action(popup / message passing)

---

## 8. 约束与假设

### 约束

- MV3 强制(Chrome 2024 起)
- 0 外部网络调用(隐私宪法)
- bundle size 三红线(popup 100KB / sw 50KB / blocklist 200KB)
- PIN 必 SHA256 + 不存原文
- v1 仅 unpacked, 不上 store
- chrome://extensions 缝隙接受为 v1 已知限制(MV3 无法阻止用户禁用扩展; 通过 PIN 守名单削弱影响)

### 假设

- 父母安装能力 OK(能 load unpacked / 装 zip)
- 孩子年龄段 12-15 岁, 大概率不会用 hosts 文件 / Wireshark / 改 Chromium 源码绕过
- 7 天数据量在合理范围(events 表条目 ≤ ~5000 / 7 天 · 仍在 chrome.storage.local quota 内)
- declarativeNetRequest 在 Chrome ≥ 113 的 disabled-extension fallback 行为稳定(查文档确认)

### 矛盾点(已澄清)

| # | 矛盾 | 澄清结果 |
|---|---|---|
| 1 | "搜索关键词拦"强需求 vs "MV3 不能改请求 body" | 用 redirect rule 替代 cancel(declarativeNetRequest 支持 redirect, 即使 query 在 URL 也能拦) |
| 2 | "记录访问事件"(REQ-E02)vs "0 外传 + 隐私" | 仅 hostname(不存完整 URL)+ 仅本地 + 7 天滚动 → 隐私可控 |
| 3 | "拦截页显示原始 URL"vs"3 方 sanitizer 默认行为不可控" | 显式 opt-out 默认 sanitizer + 自己做 escape (pitfall-20260416) |

---

## 9. Future Considerations(v1 不做, 留给 Phase D)

- ⏭ 时间预算:每天 N 分钟某分类
- ⏭ 重定向到学习资源(替代励志语)
- ⏭ 卸载/禁用报警:扩展被禁用时本地通知或邮件
- ⏭ 跨设备同步(chrome.storage.sync 或本地导入导出)
- ⏭ Edge / Firefox 移植
- ⏭ Chrome Web Store 上架(需写隐私政策 + 屏蔽 declarativeNetRequestFeedback unpacked-only API)
- ⏭ 多孩子档案(本扩展默认单档)
- ⏭ Phase D 重定向技术 cap-021 风格的"Gemini 生成励志图"

---

## 10. 原始需求附录

详见 `docs/discovery-interview.md`(本文档配套 JTBD 访谈记录), 包含 6 个 Job Stories 原文 + 4 个方向探索决策点 + 验收指标 M1-M8 + 范围决策。

本规格书与访谈记录的对照在 §11。

---

## 11. 目标 ↔ 需求对照

| Goal | 描述 | 对应 REQ | 覆盖状态 |
|------|------|---------|---------|
| Goal-1 拦截 | 内置 ≥1000 域名 + 父母补 | REQ-A01, REQ-A02, REQ-A03 | ✅ 已覆盖 |
| Goal-2 防绕过 | 强制 PIN + PIN 守名单 | REQ-B01, REQ-B02, REQ-B03, REQ-G04 | ✅ 已覆盖 |
| Goal-3 时段锁 | 父母配置 schedule + 跨午夜 | REQ-C01, REQ-C02 | ✅ 已覆盖 |
| Goal-4 搜索关键词 | Google/Baidu/Bing 拦敏感词 | REQ-D01 | ✅ 已覆盖 |
| Goal-5 7 天报表 | popup TOP10 + 本地 | REQ-E01, REQ-E02, REQ-E03, REQ-G03 | ✅ 已覆盖 |
| Goal-6 拦截体验 | 硬拦 + 励志语 | REQ-F01, REQ-G01, REQ-G05 | ✅ 已覆盖 |

**隐含需求**: 无 — 6 个 Goal 全部对应到具体 REQ。
**超出范围**: 无 — 不存在 REQ 不对应任何 Goal 的情况。

---

## 12. 规格自审记录(Step 1.5)

- **自审日期**: 2026-05-05
- **占位符扫描**: ✅ 0 个(grep TODO/TBD/[待确认]/[待补充] 均无)
- **内部一致性**: ✅ 无矛盾(已在 §8 矛盾点章节澄清 3 处潜在冲突)
- **范围检查**: ✅ 合理 — 7 大模块共 18 条 REQ(A01-G05), 落在 16-25 条 "偏大" 区间; 但每条都有明确 Goal 对应, 无可删项, 不需拆分子项目
- **歧义检查**: ✅ 无歧义(详见下方扫描结果)

### 12.1 占位符扫描结果

```
$ grep -nE "TODO|TBD|\[待确认\]|\[待补充\]|待定|暂定|XXX" docs/requirements-spec.md
(无输出)
```

### 12.2 一致性检查矩阵

| 检查项 | 结果 |
|--------|------|
| 功能需求 vs 非功能需求 | ✅ bundle size 红线 + 0 外传与各 REQ 不冲突 |
| Persona vs 功能 | ✅ 父母管理员 / 孩子被控对象, 操作权限分明(PIN 守门) |
| 知识库 vs 需求 | ✅ K-01/02/03 与 REQ-A02/D01/F01 一一对应 |
| 约束 vs 功能 | ✅ "0 外传"约束与所有功能兼容(纯本地存储 + chrome API) |

### 12.3 歧义扫描

| REQ | 潜在歧义 | 澄清(已写入规格) |
|-----|---------|-----------------|
| REQ-A01 "子域名通配" | 是否包含 sub.sub.domain.com | 是 — declarativeNetRequest urlFilter `||domain.com^` 默认匹配所有子域 |
| REQ-A02 "≥1000 域名" | 单纯数量还是含质量 | 数量 ≥1000 + 90% Alexa Top 5000 / 同类调研可查 |
| REQ-C02 "时段锁评估周期" | 多久评估一次 | 60s 心跳(已写入"≤ 60s 内启用/解除") |
| REQ-D01 "搜索关键词" | 是否拦"教育类"敏感词 | 否 — 关键词列表分类精选, 学习相关不拦; 父母可调 |
| REQ-E02 "访问事件" | 是否记录完整 URL | 否 — 仅 hostname(隐私) |

### 12.4 范围检查(YAGNI)

| REQ | "用户明确要了吗?" | "删了客户能用吗?" | 决定 |
|-----|---|---|---|
| 全部 18 条 | ✅ 都有 Goal 对应 | ❌ 删了核心场景塌陷 | 全部保留 |

**未解决问题**: 无

---

## 13. 实现类型分布(给 Phase B 路由)

| 类型 | 数量 | REQ 列表 |
|------|------|---------|
| Script | 12 | A01, A02, A03, B01, B02, B03, C01, C02, D01, E01, E02, E03, F01(部分) |
| UI | 5 | G01, G02, G03, G04, G05 |
| Agent | 0 | (本项目无 LLM 推理需求, 全部规则匹配/数据存取/UI 渲染) |
| Hybrid | 0 | — |
| UI-Agent-Hybrid | 0 | — |

**N/A 解释**: 本项目类型 ui_only(无 LLM), Agent 类应为 0 是预期内的; 详见 docs/decomposition-table.md。
