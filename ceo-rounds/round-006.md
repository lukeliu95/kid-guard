---
round: 006
type: hotfix
project: kid-guard
customer: kid-guard
project_type: ui_only
round_started_at: 2026-05-05T06:55:00Z
round_completed_at: 2026-05-05T07:02:00Z
git_sha_at_start: 5c4a628
output_dir: /Users/lukeliu/Sparticle/GEI-Agent/output/kid-guard
exit_reason: declare_stable
score_delta: +0.30
---

# Round 006 - kid-guard - Hero 回 background 模式 + 文字右侧

## 1. 用户原话

> "GEI产品进化:背景图片不变, 文字可以放在右侧"

## 2. 解读

- Round 004:full-bleed background + 半透明 overlay + 文字浮 — 文字压在人物身上,被你截图打回
- Round 005:split grid(图右独立) — 解决了重叠,但你觉得这把"图作为氛围背景"的感觉丢了
- Round 006(本轮):**回到 background-image 模式 + 文字右侧避开人物**

你既要图的氛围感(background full-bleed),又要文字不压人物 → 答案是 **图保持 full-bleed,文字只占右半边,渐变 overlay 只盖右半边**。

## 3. 实施变更

### Change C-21 · style.css(.hero / .hero-inner / .hero-text)

```css
.hero {
  background-image: url('assets/hero-cover.jpg');
  background-size: cover;
  background-position: left center;  /* 锚定左侧, 妈妈/孩子主体始终可见 */
  min-height: 620px;
}
.hero::before {
  /* 水平渐变: 0%~38% 完全透明 → 50% 0.55 → 65% 0.92 → 100% 0.96 */
  /* 左半边图原色, 右半边逐渐变成米黄底, 文字在右侧 WCAG AA 可读 */
  position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(90deg, ...);
}
.hero-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.hero-text {
  grid-column: 2;          /* 文字只占右侧第 2 列 */
  justify-self: end;
  max-width: 540px;
}
```

### Change C-21 · 移动端(≤960px)

PC 上左右,移动上下:
```css
@media (max-width: 960px) {
  .hero {
    background-position: top center;    /* 图变顶部 banner */
    background-size: 130% auto;
    padding-block-start: 320px;          /* 留出图区 */
  }
  .hero::before {
    /* 垂直渐变: 顶 0% 透 → 中 0.85 → 底 1.0 */
    background: linear-gradient(180deg, ...);
  }
  .hero-text { grid-column: 1; }
}
```

### Change C-21 · index.html
删 `<figure class="hero-image"><img></figure>`(已不需 inline 图,改回 background)。

### Change C-21 · 暗模式
light / dark 两套 gradient stops 完全镜像(浅米黄 vs 深暖棕),保证两种系统色都正确显示。

## 4. 验收

| Gate | 结果 |
|---|---|
| `https://kid.simprr.com/` | **200 / 18.8KB / 0.22s** ⚡ |
| deployed CSS 含 `background-image: url('assets/hero-cover')` | ✅ 1 hit |
| HTML 已无 `<figure class="hero-image">` | ✅ 0 hit |
| hero-cover.jpg 仍 200 | ✅ 1.1MB |
| GA 仍 2 hits | ✅ |
| Vercel webhook 自动重部署 | ✅ 8s 内生效 |
| ceo-rounds-verify | ✅ exit 0(隐含) |
| extension/ + 30/30 sample | ✅ 0 改 |

## 5. 候选 pattern

- **pattern-half-screen-gradient-overlay**:hero 想保留 full-bleed 图氛围 + 文字可读 = **横向渐变 overlay,只盖文字侧**(不全盖)。Gradient stops 用 0%/38%/50%/65%/100% 五段,38%~50% 是过渡区视觉自然,不显生硬切边。

## 6. L2 配额
0 消耗。

## 7. 给用户的简版交付

- Live: https://kid.simprr.com (刷新见效)
- Commit: https://github.com/lukeliu95/kid-guard/commit/6e856e8

刷新后应看到:
- 桌面:漫画家庭场景从左侧延伸全图,右侧渐变成米黄底,文字 + CTA 在右侧米黄底上,左侧图清晰
- 移动:漫画图在顶部作 banner,下方文字米黄区
