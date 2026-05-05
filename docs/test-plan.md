# 安装后自测清单 (Test Plan for Parents)

> 装好 KidGuard 之后, 用这份清单走一遍, 确认每个功能都正常。
> 大约 10 分钟, 建议在孩子不在场时操作。

## 1. 安装与首次启动

- [ ] 解压 kid-guard.zip
- [ ] 打开 Chrome -> chrome://extensions -> 右上角"开发者模式"开关打开
- [ ] 点击"加载已解压的扩展程序" -> 选刚才解压出的 dist/ 目录
- [ ] 看到工具栏出现 KidGuard 图标 (深蓝色盾牌占位 K)
- [ ] **自动打开 onboarding 页**(若没自动打开, 点工具栏 KidGuard 图标也会进入)
- [ ] 设 4-6 位 PIN, 再输一次确认
- [ ] 选一个退出问题(或自己写一个), 写答案
- [ ] 完成 -> 跳到 options 页

> ⚠️ 不要让孩子看到 PIN 和退出问题答案。

## 2. 拦截功能验证

- [ ] 打开新标签 -> 输入 `https://4399.com` -> 回车
  - [ ] 跳到 KidGuard 拦截页
  - [ ] 显示分类: games
  - [ ] 显示主机名: 4399.com
  - [ ] 显示一句励志语
  - [ ] **没有任何"返回"或"继续访问"按钮**(硬拦)
- [ ] 试 `pornhub.com` -> 拦截页 / 分类: adult
- [ ] 试 `bet365.com` -> 拦截页 / 分类: gambling
- [ ] 试 `douyin.com` -> 拦截页 / 分类: douyin_like

## 3. PIN 守门验证

- [ ] 打开 options -> 应该弹 PIN 蒙层
- [ ] 输入错的 PIN -> 应显示错误
- [ ] 连错 5 次 -> 应显示"30 秒冷却中"
- [ ] 等 30 秒后再输入正确 PIN -> 解锁
- [ ] 解锁后可以编辑黑名单 / 切分类 / 改时段
- [ ] 5 分钟后再操作 -> 应再次弹 PIN(重新验证)

## 4. 添加自定义黑名单

- [ ] options -> 黑名单 tab
- [ ] 在"deny"列表加 `bilibili.com`
- [ ] 保存
- [ ] 新标签访问 `bilibili.com` -> 跳拦截页 / 分类: manual_deny
- [ ] 再回到 options 删除这条 -> 验证再访问可以正常打开

## 5. 时段锁验证

- [ ] options -> 时段 tab -> 加一个窗口"周一到周日, 22:00 - 06:00"-> 启用 -> 保存
- [ ] **临时测试方法**: 把时段改成"现在的时间到现在的时间 +5 分钟"测试, 然后访问任意网站 -> 应跳到拦截页 / 副标题: "现在是作息时间, 网页已锁定"
- [ ] 时段过去后 -> 应能正常访问网站
- [ ] 测完记得改回正确的作息时间窗口

## 6. 搜索关键词拦截

- [ ] 在 options -> 关键词 tab 确认总开关已开 + 7 类全启用
- [ ] 在 Google 搜 "破解游戏" -> 跳拦截页 / 副标题: "敏感关键词拦截"
- [ ] 在 Baidu 搜 "成人视频" -> 跳拦截页
- [ ] 在 Bing 搜 "在线赌场" -> 跳拦截页

## 7. popup 与 7 天报表

- [ ] 玩了上面的几个测试后, 点工具栏 KidGuard 图标
- [ ] 应看到 "TOP10 拦截" 列表 + "TOP10 访问" 列表 (即使数据少也会显示)
- [ ] 数据是否仅本地: 打开 chrome://extensions -> KidGuard 详情 -> 点"service worker" -> 在 DevTools 的 Network panel 看, 应**完全空**(无任何外发请求)

## 8. 隐私验证 (M6 关键)

- [ ] DevTools -> Network -> Filter: kid-guard
- [ ] 操作扩展任何功能(改名单 / 解锁 / 看 popup)
- [ ] **确认 0 条外发请求**

## 9. 退出问题找回 PIN (灾备)

- [ ] options -> PIN tab -> 故意输错 PIN 5 次 -> 进入冷却
- [ ] (假设忘记 PIN) 去 onboarding 页面 chrome-extension://[id]/onboarding/onboarding.html?recover=1 (这个 v1 还需要走 chrome.runtime API 触发, 实战可重装扩展)
- [ ] **v1 实际灾备**: 如果完全忘记 PIN, 卸载重装即可(不防卸载是已知妥协)

## 10. 卸载与数据清除

- [ ] chrome://extensions -> KidGuard -> 移除
- [ ] 重装 -> 应再次进 onboarding (storage 已清空) 验证不留数据

## 反馈

如有任何不工作的项, 回到 GEI 说"修 kid-guard 的 X 问题"即可。
