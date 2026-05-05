---
round: 005
type: hotfix
project: kid-guard
customer: kid-guard
project_type: ui_only
round_started_at: 2026-05-05T06:20:00Z
round_completed_at: 2026-05-05T06:28:00Z
git_sha_at_start: 590c823
output_dir: /Users/lukeliu/Sparticle/GEI-Agent/output/kid-guard
exit_reason: declare_stable
score_delta: +0.35
---

# Round 005 - kid-guard - Hero 文字压图 hotfix

## 1. 用户原话

> "GEI 产品更新, 你看网页首页, 文字挡住了图片"

附截图:`hero-cover.jpg` 满铺背景 + 文字浮在上面 → 文字"守住孩子的注意力"正好压在妈妈和男孩身上,可读性差,人物形象被截断。

## 2. 根因

Round 004 hero 用 `background-image + overlay` 模式:
```html
<div class="hero-bg" style="background-image: url('assets/hero-cover.jpg')"></div>
<div class="hero-overlay"></div>
<div class="container hero-inner">...文字...</div>
```

漫画图人物分布全画面(右下角的爸爸 / 中间的妈妈 / 左侧的男孩),overlay 用半透明米黄盖一层让文字可读 — 但这反而让漫画图变成"被滤镜抹糊的背景",文字仍然落在人物身上。

GPT-image-2 没完全遵守"右侧大留白"指令,构图实际人物从左到右铺。

## 3. 修法决策

CEO 判:不重新生成图(图本身质量好),改 layout。

**不要 background overlay 模式**,改为 **CSS grid split layout**:
- 左侧 ~52%:文字(eyebrow / h1 / sub / cta / bullets)
- 右侧 ~48%:`<figure class="hero-image"><img></figure>` 大图独立呈现
- 移动端 ≤ 960px:单列堆叠,文字上 / 图下

图保留 sticker-card 风格(2.5px ink outline + warm shadow + -0.4deg tilt + hover 复正)。

## 4. 实施变更

### Change C-20 · index.html + style.css(KEPT)

`index.html`:删 `<div class="hero-bg">` + `<div class="hero-overlay">`。包文字进 `<div class="hero-text">`,加 `<figure class="hero-image"><img loading="eager" fetchpriority="high"></figure>`。

`style.css`:
- 删 `.hero-bg` / `.hero-overlay` 规则
- `.hero` 加柔和 radial-gradient warm spot color(代替 background-image 的氛围)
- `.hero-inner` 改 `display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr)`
- 加 `.hero-text { max-width: 560px }`
- 加 `.hero-image img` 完整规则(border / shadow / tilt / hover)
- `prefers-reduced-motion` guard
- `@media (max-width: 960px)` 单列堆叠

```diff
- min-height: 620px;
- padding-block: 96px 80px;
+ padding-block: 72px 64px;
+ background: radial-gradient(ellipse at 80% 20%, rgba(232, 154, 78, 0.10), transparent 60%) ...
```

## 5. 验收

| Gate | 结果 |
|---|---|
| Vercel webhook 触发自动重部署 | ✅ 8s 后 deployed CSS 含 7 条 hero-text/hero-image rules |
| `https://kid-guard-pi.vercel.app/` | 200 / 19KB / 0.5s |
| `https://kid.simprr.com/`(用户自定义域) | 200 / 19KB / **0.27s**(更快 — Vercel edge 优化生效) |
| `<figure class="hero-image">` 在 HTML | ✅ 1 hit |
| `.hero-bg` 在 HTML | ✅ **0 hit**(干净删除) |
| GA G-NWMQ1ZWXL1 仍 2 hits | ✅ |
| ceo-rounds-verify | ✅ exit 0 |
| extension/ 0 改 | ✅ |
| 30/30 sample 仍 100% | ✅ |

## 6. 用户旁路 commit 处理

push 时发现 remote 有用户独立 commit `51da0c9 "Change landing page URL in README"`(用户在 GitHub web 改 README,把落地页 URL 从 `kid-guard-pi.vercel.app` 改成 `kid.simprr.com` — 说明用户已绑自定义域)。`git pull --rebase` 拉下来再 push,无冲突(改的是 README,我改的是 HTML/CSS)。

学习记录:**用户 GitHub web 直接改 README** 是合法 workflow,本地 push 前应 fetch 看 remote ahead。后续 push 走 rebase 模式可避免被拒。

## 7. 退出条件

- 用户截图问题(文字压图)已解 → 实测两域都 200 + DOM 验证
- 0 回归
- 用户旁路 commit 已 rebase 整合

→ **declare_stable**

## 8. L2 配额
0 消耗。

## 9. 候选 pattern

- **pattern-bg-image-overlay-vs-grid-split**:hero 用 `background-image + overlay` 模式适合**简洁 hero 图**(如纯图标 / 抽象图形),不适合**人物 / 复杂场景图**(会让文字落在脸上)。复杂图应走 split grid 让图独立呈现。
- **pattern-fetch-before-push**:多人 / 用户旁路改 GitHub web UI 时,本地 push 前 `git fetch` + `git pull --rebase` 是 defensive habit,避免 reject。

## 10. 给用户的简版交付

- Live: https://kid.simprr.com (自定义域已生效)
- Commit: https://github.com/lukeliu95/kid-guard/commit/a234b3e
- 预计你刷新页面 → 应看到家庭漫画图独立完整在右侧,文字在左侧,不再重叠
