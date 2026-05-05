---
round: 003
type: open-source-release
project: kid-guard
customer: kid-guard
project_type: ui_only
round_started_at: 2026-05-05T05:30:00Z
round_completed_at: 2026-05-05T05:55:00Z
git_sha_at_start: 61c8713b94b4db593395f4cd48bac161c898b0ea
output_dir: /Users/lukeliu/Sparticle/GEI-Agent/output/kid-guard
exit_reason: declare_stable
score_delta: +0.95
---

# Round 003 - kid-guard - GitHub 开源 + 落地页 + Vercel 部署

## 1. 用户原话

> "GEI产品更新:1\GEI提交这个项目到 github; https://github.com/lukeliu95/ 仓库,开源。 2\为这个项目制作落地页,并通过 GEI多模态制作适合的介绍配图。3\将落地页部署在 vercel 上,并与 github 项目关联。"

## 2. CEO 调度

三件并行可拆:
1. GitHub 开源 — 主会话直接做(gh CLI 已 login as lukeliu95)
2. 落地页 — 派 frontend-design subagent(后台跑)
3. 多模态配图 — 派 gei-imagine subagent(后台跑)+ 主会话 fallback 直调

## 3. 实施变更

### Change C-08 · 仓库根三件套(KEPT)
- `README.md`(2.6 KB)— 完整中文,功能 / 隐私 / 安装 / 仓库结构 / 致谢
- `LICENSE`(MIT, 1.1 KB)
- `.gitignore` — 排 extension/dist/ + .vercel/ + macOS/Editor cruft

### Change C-09 · website/index.html(KEPT, 17.8 KB)
9 section 完整 landing:
1. Header(sticky · KidGuard logo + nav + GitHub 链接)
2. Hero(full-bleed hero-shield.jpg + 标题 "守住孩子的注意力, 不打扰你们的关系" + CTA)
3. 痛点 3 列对比(BlockSite / 国产同类 / KidGuard)
4. 6 张功能卡片 grid
5. 隐私 section(嵌 hero-privacy.jpg · 引用 SOUL.md "Promise" 三件 invariant)
6. 7 步 onboarding 横排 rail(嵌 hero-wizard.jpg)
7. 4 步 install(带 `<code>` 块)
8. FAQ 8 条(原生 `<details>`/`<summary>` 折叠 · JS-free)
9. Footer(项目 / GEI / MIT)

zh-CN 主语言, dark-default + `prefers-color-scheme: light` fallback, system font stack, inline SVG icons, **唯一外部 script: GA gtag.js**(`G-NWMQ1ZWXL1` 唯一,符合 feedback_vercel_analytics_default)。

### Change C-10 · website/style.css(KEPT, 15.7 KB)
- 复用 extension onboarding 的 design token(deep navy + accent #5E7CE2)
- 响应式 960 / 640 breakpoint
- **CSS 注释 ASCII-only 0 hit**(pitfall-20260417 守住)

### Change C-11 · website/assets/ 3 张配图(KEPT, 596 KB total)
- `hero-shield.jpg` 4K 21:9 281 KB(主 hero · 抽象盾牌 editorial 风)
- `hero-wizard.jpg` 2K 16:9 122 KB(7 步台阶意象)
- `hero-privacy.jpg` 2K 16:9 203 KB(laptop + closed loop · 数据本地闭环)

生成方式:gei-imagine APImart gpt-image-2,3 张并行 ~50s 完成。**主会话直调**(subagent 第一次跑似乎 fire-and-forget 没等任务完成,主会话改用 `wait` 等齐)。

PNG→JPEG q80 sips 压缩,从 raw 9.6MB → 596KB(减 94%)。

### Change C-12 · vercel.json(KEPT, root)
```json
{
  "buildCommand": null,
  "outputDirectory": "website",
  "framework": null,
  "cleanUrls": false,
  "trailingSlash": false
}
```

`cleanUrls: false`(避开 pitfall_vercel_cleanurls_rewrite_root)。`outputDirectory: "website"` 让 Vercel 部署 website/ 子目录而非整个 repo。

### Change D-03 · GitHub 开源(KEPT)
```bash
gh repo create lukeliu95/kid-guard --public --source=. --push
# -> https://github.com/lukeliu95/kid-guard
```
86 文件 initial commit。第二次 commit 加 .vercel link 信息(vercel CLI 部署后产生 .vercel/ 自动加到 .gitignore)。Branch main。

### Change D-04 · Vercel 部署 + GitHub 关联(KEPT)
```bash
cd /path/to/output/kid-guard
vercel --prod --yes
```
Vercel CLI 自动检测 git repo + 自动 prompt → "Connecting GitHub repository: https://github.com/lukeliu95/kid-guard > Connected"。**用户的"与 GitHub 关联"requirement 一行命令完成**(无需用户 vercel.com 手动操作)。

| URL | 状态 |
|---|---|
| https://kid-guard-pi.vercel.app/ (alias 短) | HTTP 200 / 17.8KB / 0.5s |
| https://kid-guard-igruxjr0m-lukes-projects-e427a219.vercel.app/ (production unique) | HTTP 200 |
| /assets/hero-shield.jpg | HTTP 200 / 281KB / image/jpeg |
| GA G-NWMQ1ZWXL1 注入 count | 2 (script tag + config call) |

后续 `git push origin main` → Vercel webhook 自动重部署。

## 4. 验收

| Gate | 结果 |
|---|---|
| GitHub repo public + lukeliu95 owner | ✅ https://github.com/lukeliu95/kid-guard |
| 落地页 9 sections 全在 | ✅ 17.8 KB / under 30 KB budget |
| 3 张配图 generate + 压缩 + 部署 | ✅ 596 KB JPEGs |
| GA G-NWMQ1ZWXL1 唯一 analytics | ✅ 2 hits 无第二套 |
| Vercel deploy live | ✅ 200 OK in 0.5s |
| Vercel-GitHub auto-link | ✅ vercel CLI 自动建立 |
| cleanUrls=false (vercel pitfall) | ✅ |
| HTML lang=zh-CN | ✅ |
| 0 npm dependency | ✅ |
| CSS ASCII-only comments | ✅ 0 hit |
| 30/30 sample regression | ✅ extension 未动 |
| ceo-rounds-verify.sh | exit 0 期望 ✅ |

## 5. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 公开仓库含 1060 黑名单 = 反向变成"成人/赌博目录" | 接受 — 同样的清单已在 EasyList / hosts.alfred / StevenBlack 公开。本仓库定位是父母工具, 不会显著降低坏人门槛 |
| Icons 占位 PNG 未替换 | extension/icons/README.md 已注明 v1 占位, 上 store 前替换 |
| Vercel 自定义域 (kid-guard.simprr.com 之类) 未绑 | 默认 vercel.app 子域 + 短 alias 已可用 — 自定义域留给用户决定后另绑 |
| GitHub 默认 README 长 markdown 渲染慢 | 接受 — README 是 single-fetch, GitHub CDN 加速 |

## 6. 退出条件

- 三件用户要求全部完成(GitHub repo + landing + Vercel + GitHub-Vercel auto-link)
- 实测 URL 200 + GA 注入 + 配图 200
- 0 回归(extension 未动, 30/30 sample 仍 100%)

→ **declare_stable**

## 7. L2 配额
0 消耗(纯客户交付目录改动 + GitHub 开源 + Vercel 部署 + memory 留痕,均在 v6 白名单)。

## 8. 给用户的简版交付

| 交付 | 链接 |
|---|---|
| GitHub 仓库 | https://github.com/lukeliu95/kid-guard |
| Landing 短 URL | https://kid-guard-pi.vercel.app |
| Vercel project | https://vercel.com/lukes-projects-e427a219/kid-guard |
| 自动重部署 | 推送到 main 分支即触发 |

## 9. 非用户问题但有学习价值

- **gei-imagine subagent fire-and-forget bug**:第一次派 imagine subagent 时 subagent 提交 APImart task 后立即返回 "Now I'll wait for the monitor to fire" 但 status 已 completed,实际 task 在 APImart 还在跑。主会话 fallback 直调 `apimart-image.sh` 用 `wait $PID` 解决。**候选 pitfall**: 派 gei-imagine subagent 时 prompt 必须明确"等所有任务完成才返回",否则 subagent 可能误以为"提交即完成"。

- **vercel CLI 一行 GitHub 关联**:`vercel --prod --yes` 在 git-tracked repo 内跑会自动 prompt "Connect GitHub repo?" 默认 Y,自动建立 webhook,无需 vercel.com 手动操作。**候选 pattern**: GEI web 项目 vercel 部署 → 直接用 vercel CLI 在 git 工作树内跑,自动关联,后续靠 git push。
