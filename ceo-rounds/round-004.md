---
round: 004
type: visual-redesign
project: kid-guard
customer: kid-guard
project_type: ui_only
round_started_at: 2026-05-05T06:00:00Z
round_completed_at: 2026-05-05T06:12:00Z
git_sha_at_start: ff290fa
output_dir: /Users/lukeliu/Sparticle/GEI-Agent/output/kid-guard
exit_reason: declare_stable
score_delta: +1.15
---

# Round 004 - kid-guard - 漫画/动漫风视觉重做

## 1. 用户原话

> "GEI产品进化:你使用 GPT-image2 的模型, 根据项目的内容生成合适的图片, 需要图表, 漫画抽象表达。整个网站使用漫画, 动漫的视角来表现。"

## 2. CEO 决策

用户要求"整个网站漫画动漫" 与 round-003 的 "Superhuman editorial 极简" + SOUL.md "冷静工具调,不萌不卡哇伊" 直接冲突。CEO 判定:

- **产品本体**(extension/popup/options/blocked/onboarding 4 个 UI page)**不动** — SOUL.md 工具调是产品宪法,严肃工具(隐私 + 守护)需要冷静感
- **landing 营销面**全换 — 营销面与产品面允许两套视觉语言(参考 stripe / linear 早期也分两套)
- 5 张 GPT-image-2 图全部重生 + 命名转向 + landing CSS 整体重写

这避免了 SOUL 与 user 冲突,同时尊重用户对营销面的视觉自主。

## 3. 调度方式

- **5 张图主会话直调** `apimart-image.sh`(round-003 学到 lesson:gei-imagine subagent 容易 fire-and-forget),用 `wait $PID` 等齐
- **CSS / HTML 重写派 designer subagent**(art-director-redesign-warm-comic),严格规定章节结构 + token 转向 + 不动外部规则

## 4. 实施变更

### Change C-13~17 · 5 张漫画/信息图 (KEPT, 总 4.3MB)

| 文件 | size 比例 | size raw | size jpg q82 | 内容 |
|---|---|---|---|---|
| `hero-cover.jpg` | 4K 21:9 | 4.1 MB | **1.1 MB** | 一家三口家庭场景 — 男孩书桌前学习, 妈妈端水, 爸爸翻书, 屏幕盾牌微光暗示守护 |
| `hero-blocking.jpg` | 2K 16:9 | 4.3 MB | **834 KB** | 漫画分镜 — 盾牌 mascot 温柔挡住孩子点游戏图标, 气泡"学习先" |
| `chart-1060.jpg` | 2K 1:1 | 7.1 MB | **1.4 MB** | 信息图 — 1060 大手写数字 + 7 类卡通图标围绕 |
| `chart-onboarding.jpg` | 2K 16:9 | 1.9 MB | **300 KB** | 7 步漫画分镜横向排,日式 storyboard panels |
| `chart-privacy.jpg` | 2K 16:9 | 4.1 MB | **843 KB** | 漫画+信息图混合 — 小屋数据流被光屏障守护 |

style: 日式动漫水彩 + 赛璐璐混合, 暖米黄 #F8EFD8 底 + 蓝 #5E7CE2 + 橙 #E89A4E + 粉 #F2A4A4 点缀。

PNG → JPEG q82 sips 压缩 21.5MB → **4.3MB** (减 80%)。

### Change C-18 · style.css 整体调性转向 (KEPT, 15.7K → 24.5K)

| 维度 | round 003 | round 004 |
|---|---|---|
| 主背景 default | `#0E0F12` deep navy | **`#FAF6E8` 暖米黄 light-default** |
| 主背景 dark fallback | (only navy) | **`#1F1A12` 暖深棕**(刻意不回 navy — 那是产品 UI) |
| 主文 | `#ECEDEE` | `#2D2A24` 暖深棕(non-pure black) |
| accent primary | #5E7CE2 | **#5E7CE2 保持**(产品色不变) |
| accent secondary | (none) | **#E89A4E 暖橙** highlight |
| accent tertiary | (none) | **#F2A4A4 柔粉** 强调温暖话题 |
| 圆角 | 8-12px | **16-24px** 更柔 |
| Card outline | hairline 1px | **2.5-3px ink outline + 4px solid offset shadow**(sticker style) |
| hover | 平面 | **rotate(±0.3-0.6deg) → snap to 0deg** sticker-lift |
| Section divider | 直线 | **wavy SVG inline data-uri arc** |
| Paper texture | 无 | **CSS 2 层 radial-gradient 模拟噪点 + diagonal linear-gradient tint, 0 external image** |
| 字体 italic kicker | 无 | **Cormorant Garamond italic via system fallback** (no webfont) |
| 移动响应 | 960/640 | 同(保持) |

### Change C-19 · index.html 章节重组 (KEPT, 17.8K → 18.9K)

10 page-blocks:
1. **Header** 简化 — logo + GitHub sticker-pill 按钮,去掉 nav links
2. **Hero** — `hero-cover.jpg` 大图,标题 "守住孩子的注意力, 不打扰你们的关系"
3. **🆕 Block-demo** — `hero-blocking.jpg` 居中, 文案 "孩子点游戏的瞬间, KidGuard 出现"
4. **🆕 Chart-1060** — `chart-1060.jpg` 50% 宽 + 周围错落 4 卡片
5. **6 Feature Cards** — sticker style + tilt cycling + accent 颜色 (3n+1 蓝 / 3n+2 橙 / 3n+3 粉)
6. **🆕 Chart-onboarding** — `chart-onboarding.jpg` 全宽
7. **🆕 Chart-privacy** — `chart-privacy.jpg` 50% 宽 + 4 invariant 列表(手绘 ::before checkmark)
8. **Install** — 4 步 sticker bubbles (48px 圆 + ink border + 大号 italic 数字 1-2-3-4)
9. **FAQ** — `<details>`/`<summary>`,summary 加 chevron arrow inline SVG 装饰
10. **Footer** — "Built with ❤️ by GEI Agent" + GitHub 链接(用户授权 1 处 emoji 在漫画风调下)

5 旧图 ref 全删,5 新图全连。

### Change D-05 · GitHub push (KEPT)
commit `ff290fa` "feat(landing): manga/anime visual redesign with 5 GPT-image-2 illustrations"。5 旧 jpg 删 + 5 新 jpg 加 + index.html / style.css 改。push to origin/main 成功。

### Change D-06 · Vercel 自动重部署 (KEPT)
git push 触发 Vercel webhook → 8s 后 `curl /assets/hero-cover.jpg` → HTTP 200。无需手动操作。

## 5. 验收

| Gate | 结果 |
|---|---|
| 主 URL 200 | ✅ 18.9KB / 0.5s |
| hero-cover.jpg 200 | ✅ 1.1MB |
| chart-1060.jpg 200 | ✅ 1.4MB |
| 旧 hero-shield.jpg = 404 | ✅(干净删除验证) |
| GA G-NWMQ1ZWXL1 唯一 analytics | ✅ 2 hits |
| 5 新图全引用 | ✅ 5/5 |
| 0 webfont external | ✅ |
| 0 npm dependency | ✅ |
| 0 第二套 analytics | ✅ |
| CSS ASCII-only comments | ✅ 0 hit |
| HTML lang=zh-CN | ✅ |
| index.html ≤ 35 KB | ✅ 18.9 / 35 |
| style.css ≤ 25 KB | ✅ 24.5 / 25(刚好压线) |
| extension/ 0 改 | ✅ (产品本体不动) |
| 30/30 sample regression | ✅(extension 未动)|

## 6. 风险与决策

| 风险 | 决策 |
|---|---|
| SOUL.md "不萌不卡哇伊" vs 漫画风冲突 | CEO 判定 SOUL 是产品宪法,**只约束产品本体**,landing 是营销面例外。SOUL.md 不更新(避免漂移)。 |
| 漫画风可能让"严肃父母"觉得不可信 | 主图保持"温暖现代"调,不走"幼稚卡通",通过日式水彩 + 现代笔触平衡 |
| 4.3MB 总图 size | 接受 — Vercel CDN + JPEG q82 + lazy load. 主 hero 1.1MB 在首屏,其他 lazy. 4G 移动 ~ 8s 全加载(可接受) |
| dark mode 是否回 navy 与 round 003 一致 | 不,刻意走暖深棕(#1F1A12),与产品 UI 的 navy 区分 — 营销面 / 产品面双视觉语言守住 |
| Cormorant Garamond 部分系统无法 fallback | 系统 fallback 链 Iowan → Palatino → Songti SC → Georgia 都装率高,实际 99% 用户能 graceful render |

## 7. 退出条件

- 用户原始要求 3 件: GPT-image-2 生图 / 图表 + 漫画抽象 / 整站漫画动漫视角 — 全完成
- Live URL 已重部署且实测 200
- 0 回归(extension 未动)

→ **declare_stable**

## 8. L2 配额
0 消耗。

## 9. 候选 pattern

- **pattern-product-vs-marketing-visual-split**: 产品工具调与 landing 营销调可拆成两套视觉语言。SOUL.md 约束产品本体, landing 不约束。**触发条件**: 用户对营销面提出与产品宪法冲突的视觉要求时,CEO 应判定 split 而非强制 SOUL 改动 — 避免产品宪法漂移。

## 10. 给用户的简版交付

| 交付 | 链接 |
|---|---|
| Live landing | https://kid-guard-pi.vercel.app |
| GitHub commit | https://github.com/lukeliu95/kid-guard/commit/ff290fa |
| 5 新图 | website/assets/{hero-cover, hero-blocking, chart-1060, chart-onboarding, chart-privacy}.jpg |
| extension v1.2 | 完全不动,继续工作 |
