# KidGuard

> Chrome MV3 浏览器扩展 · 家庭友好的内容拦截器 · 帮孩子专注学习

[![Built by GEI Agent](https://img.shields.io/badge/built%20by-GEI%20Agent-5E7CE2)](https://github.com/lukeliu95/kid-guard)
[![License: MIT](https://img.shields.io/badge/license-MIT-46A758.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/chrome-MV3-0E0F12)](https://chrome.google.com/)

KidGuard 帮父母把 12-15 岁孩子的浏览器流量挡在游戏 / 成人 / 短视频 / 抖音类 / 赌博 / 抽卡充值 / VPN 代理之外, **零数据外传**, **零 LLM**, **零 npm 依赖**。1060 个精选域名内置 + 7 类自动拦截 + 时段锁 + 关键词拦截 + 7 步 onboarding 引导 + PIN 守门。

落地页:[https://kid-guard.vercel.app](https://kid-guard.vercel.app) (待部署后生效)

## 功能一览

| 维度 | 实现 |
|---|---|
| **域名拦截** | 1060 个精选域名 + 7 类(games / adult / social_short_video / douyin_like / gambling / gacha_recharge / vpn_proxy)+ 父母手动补 |
| **关键词拦截** | Google / Baidu / Bing 三大搜索引擎 · 231 patterns 覆盖 7 类 |
| **时段锁** | 跨午夜支持(如 22:00 - 06:00),整段不可上网 |
| **PIN 守门** | 4-6 位 PIN + SHA256+salt 哈希 + 退出问题灾备 + 5 次错冷却 30s |
| **7 步 Onboarding** | 欢迎 → PIN → 确认 → 退出问题 → 启用分类 → 高级设置 → 完成 |
| **本地报表** | 7 天访问 / 拦截 TOP10 · 仅本机 · 0 外发 |
| **Stack** | Vanilla HTML/CSS/JS · 0 npm 依赖 · 总 zip ~124 KB |
| **隐私** | `chrome.storage.local` 全本地, network panel 永远空 |

## 快速安装

1. **下载** 仓库或 [Releases](https://github.com/lukeliu95/kid-guard/releases) 中的 zip
2. **构建**(可选 — 仓库已含构建好的 `extension/dist/`):
   ```bash
   cd extension/
   bash build.sh
   ```
3. **加载到 Chrome**:
   - 打开 `chrome://extensions`
   - 右上角打开"开发者模式"
   - 点"加载已解压的扩展程序" → 选 `extension/dist/`
4. **首次启动** 自动跳到 7 步 onboarding 设 PIN + 配置 → 完成。

详见 `extension/docs/INSTALL.md` (中文)。

## 仓库结构

```
.
├── extension/              Chrome MV3 扩展源码 (实际交付物)
│   ├── manifest.json
│   ├── background/         service worker + 5 feature modules
│   ├── shared/             constants / storage / messaging / pin-guard
│   ├── popup/  options/  blocked/  onboarding/   4 UI pages
│   ├── ruleset/            7 类 declarativeNetRequest JSON (1060 hosts)
│   ├── data/               keywords + 励志语
│   ├── icons/  _locales/
│   └── build.sh            build → dist/ + zip
├── website/                Vercel 落地页
├── docs/                   GEI 流水线 11 份文档 (需求 / 评估 / 交付报告等)
├── ceo-rounds/             Phase D 演化记录 (round-000 baseline + round-001~003)
├── pipeline-state.json     GEI 流水线状态机 (audit trail)
├── SOUL.md                 产品人格 / 价值观 / 边界
├── CLAUDE.md               给未来 maintainer 的项目上下文
└── README.md               (本文件)
```

## 隐私承诺

KidGuard **不上传任何数据**。三件 invariant:

1. **零外传**:Network panel 在任何场景下看不到任何 outbound request
2. **零数据残留**(用户卸载时):chrome.storage 自动清,不留 cookie
3. **PIN 不可猜**:4-6 位 PIN + 随机 salt + SHA256;5 次错冷却 30s

完整内容见 [SOUL.md](SOUL.md) "Promise" 节。

## 技术亮点

- **无任何外部依赖**:0 npm 包,0 framework,0 webfont,纯 vanilla HTML/CSS/JS
- **MV3 declarativeNetRequest**:静态 ruleset (7 类) + 动态规则 (自定义屏蔽 + 关键词 + 时段锁), 浏览器原生层拦截, 低开销
- **bundle size 红线**:popup ≤ 100KB / sw ≤ 50KB / total ≤ 800KB,实际 zip 124KB
- **A11y 合格**:WCAG 2.2 AA 对比度,焦点环,屏读友好(onboarding h1 切换 focus)
- **CI-runnable 验收门**:8 个 deterministic gate (M1-M8) + 30 sample fixture 100% 命中

详见 `docs/evaluation-framework.md`。

## 已知限制

1. **chrome://extensions 缝隙**:MV3 不允许扩展阻止自己被禁用 — 父母 PIN 保护配置, 不保护"扩展存在"
2. **Icons 是占位**:深蓝填充 PNG 占位 ─ 上 Chrome Web Store 前替换
3. **未上 Web Store**:v1 仅本地 unpacked

均见 `docs/delivery-report.md` 第 7 节"已知限制"。

## 开发与维护

- 直接编辑 `extension/` 源码, `chrome://extensions` 点 reload 即热更新
- 改完跑 `bash extension/build.sh` 出新 zip + size 表
- 加新功能或修 bug → 在新分支开 PR;主分支由 GEI 流水线维护

详见 [CLAUDE.md](CLAUDE.md) Hard Rules 节。

## 致谢与归属

- 由 [GEI Agent](https://github.com/lukeliu95) v6.2 流水线自动生成 (Phase A→B→C→D R002 v1.2)
- 落地页配图由 GEI gei-imagine worker 生成 (gpt-image-2 via APImart)

## License

MIT — 见 [LICENSE](LICENSE)。

## 反馈

提 [Issue](https://github.com/lukeliu95/kid-guard/issues) 或在 [Discussions](https://github.com/lukeliu95/kid-guard/discussions) 留言。
