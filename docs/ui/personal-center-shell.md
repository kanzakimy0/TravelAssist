# TravelAssist 头像菜单 / Personal Center Shell 设计书

> 文档版本：v1.0  
> 更新日期：2026-09-05  
> 对应 WBS：**1.22 头像菜单 / Personal Center Shell 设计**  
> Owner：B / Personal Center  
> 上游设计：`docs/ui/personal-center.md`（WBS 1.21）  
> 状态：**设计冻结，可作为后续 5.1 / 5.2 实现基准**

---

## 1. 设计目标

WBS 1.22 不重新设计个人中心首页内容，而是冻结个人中心长期复用的“外壳”和头像入口交互。

本设计包含两部分：

1. **Avatar Popover**：用户点击主系统或个人中心右上头像后出现的账户快捷菜单。
2. **Personal Center Shell**：个人中心所有页面共用的左侧 Sidebar、右上全局操作区、主内容容器与背景规则。

核心原则：

> **Shell 负责导航与空间；页面内容负责具体业务。**

后续“我的旅行 / 旅行偏好 / 同行人 / 账户”等页面切换时，Shell 不重做，只替换右侧 Content Area。

---

## 2. 与 WBS 1.21 的继承关系

WBS 1.22 必须继承 WBS 1.21 已冻结的视觉和 IA：

- 一级导航固定为 5 项：
  - 我的首页
  - 我的旅行
  - 旅行偏好
  - 同行人
  - 账户
- 方案 D 作为个人中心视觉基准。
- 背景为暖米白 / 象牙白 + 淡和纸 / 水彩纹理。
- 主背景不使用富士山、大鸟居、大寺庙和装饰文字。
- 左侧栏底部保留鸟居 + 水面 + 远山 + 少量樱花的固定插画。
- 真实旅行内容继续使用写实照片。
- 整体饱和度 / 对比度相较高饱和概念稿降低约 10%。
- 不使用传统 Admin Dashboard 风格。

---

## 3. Personal Center Shell 总体结构

Desktop 16:9 基准：

```text
┌──────────────────────────────────────────────────────────────┐
│ Personal Sidebar │                                  🔔 头像⌄ │
│                  │                                          │
│ TravelAssist     │  ┌────────────────────────────────────┐  │
│                  │  │                                    │  │
│ 用户头像 / 名称  │  │            Page Content            │  │
│                  │  │                                    │  │
│ 我的首页         │  │  Home / Trips / Preferences /      │  │
│ 我的旅行         │  │  Companions / Account              │  │
│ 旅行偏好         │  │                                    │  │
│ 同行人           │  │                                    │  │
│ 账户             │  └────────────────────────────────────┘  │
│                  │                                          │
│ [鸟居水景插画]    │                                          │
└──────────────────────────────────────────────────────────────┘
```

### Shell 固定区域

```text
PersonalCenterShell
├── PersonalSidebar
├── PersonalTopActions
└── PersonalContentArea
```

页面切换时：

- `PersonalSidebar` 保持固定。
- `PersonalTopActions` 保持固定。
- 仅 `PersonalContentArea` 替换内容。

---

## 4. Personal Sidebar

### 4.1 结构

Sidebar 按以下顺序排列：

```text
PersonalSidebar
├── Brand
├── UserSummary
├── PrimaryNavigation
└── SidebarArtwork
```

### 4.2 Brand

顶部保留：

- TravelAssist Logo
- 品牌名称 `TravelAssist`

不额外增加：

- `Personal Center` 副标题
- 版本号
- 产品说明文字

目标是保持轻量，避免像管理后台。

### 4.3 User Summary

显示：

- 用户头像
- 用户名称，例如 `Yuki`

状态文本不是必须项。若保留状态，使用自然语言：

- `偏好已保存`

不建议使用：

- `旅行偏好已同步`
- `数据同步成功`

避免技术后台感。

#### 头像行为

Sidebar 内头像属于**身份展示 / Profile 快捷入口**：

- 点击头像或姓名 → Profile / Account 的个人资料区域。
- 不打开右上 Avatar Popover。

### 4.4 Primary Navigation

固定 5 项：

```text
我的首页
我的旅行
旅行偏好
同行人
账户
```

每项结构：

```text
[Icon] Label
```

当前页面允许在右侧增加一枚极小的樱花装饰符号，作为方案 D 的品牌细节。

#### 选中态

- 极浅暖粉 / 米粉背景。
- 朱红 / 珊瑚红图标与文字。
- 轻量暖色描边。
- 胶囊 / 大圆角形态。
- 不使用高饱和大面积实心红。

#### 默认态

- 透明或近透明背景。
- 深墨色图标与文字。
- Hover 时只轻微增加暖粉背景。

### 4.5 Sidebar Artwork

底部固定保留日式风景插画，是 Shell 的重要品牌识别。

画面要素：

- 朱红鸟居
- 水面 / 湖面
- 远山
- 少量樱花
- 青海波或和纸纹理

规则：

- 插画只在 Sidebar 底部。
- 不扩展进入右侧 Content Area。
- 不加入文字、标语或书法。
- 不让图片侵占导航可点击区域。
- 宽屏高度不足时，插画优先裁切，而不是压缩导航。

---

## 5. Personal Top Actions

右侧内容区顶部不设置完整二级 Header，只保留两个全局操作：

```text
PersonalTopActions
├── NotificationButton
└── AvatarMenuTrigger
```

### 5.1 Notification

使用铃铛图标。

第一阶段只冻结位置与入口，不在 WBS 1.22 定义完整通知中心。

未读状态允许出现：

- 小圆点
- 小数量 Badge

但不得使用巨大红色徽标。

### 5.2 Avatar Menu Trigger

显示：

- 小型圆形头像
- 下拉 Chevron

点击后打开 Avatar Popover。

### 5.3 左右头像并存原则

个人中心允许同时出现：

```text
Sidebar Avatar
= 身份展示 / Profile 快捷入口

Top-right Avatar
= 全局账户快捷菜单
```

二者功能不同，因此不视为重复设计错误。

---

## 6. Avatar Popover

### 6.1 触发位置

Avatar Popover 从右上 `AvatarMenuTrigger` 向下展开，靠右对齐。

推荐宽度：约 `280–300px`，具体数值在实装阶段微调。

### 6.2 信息结构

```text
┌────────────────────────────┐
│  ○  Yuki                   │
│                            │
│  查看个人中心           →   │
├────────────────────────────┤
│  🧳 我的旅行                │
│  ♡  旅行偏好                │
│  👥 同行人                  │
├────────────────────────────┤
│  ⚙ 账户设置                │
│  ↗ 退出登录                │
└────────────────────────────┘
```

### 6.3 菜单项行为

| 菜单项       | 行为                                                |
| ------------ | --------------------------------------------------- |
| 查看个人中心 | 打开个人中心 Home；若已在个人中心，则回到“我的首页” |
| 我的旅行     | 打开 Trips                                          |
| 旅行偏好     | 打开 Preferences                                    |
| 同行人       | 打开 Companions                                     |
| 账户设置     | 打开 Account                                        |
| 退出登录     | 执行退出登录流程；具体确认策略归认证实现阶段        |

### 6.4 不进入头像菜单的内容

以下内容不做头像菜单一级项：

- 草稿
- 历史
- 收藏
- 已归档旅行
- 旅行灵感
- 目的地探索
- AI 历史
- 数据删除

原因：菜单必须保持快捷，不复制完整个人中心 IA。

其中：

- 草稿 / 历史 / 收藏 → `我的旅行`
- 数据删除 → `账户` 深层
- 旅行灵感 / 目的地探索 → 首页“更多功能模块”

---

## 7. Avatar Popover 视觉规范

延续方案 D，但浮层本身要克制。

### 背景

- 暖米白 / 象牙白。
- 可有非常轻的半透明或和纸质感。
- 不使用明显水彩大图。

### 边框与阴影

- 暖粉褐低对比边框。
- 轻柔阴影。
- 不使用厚重黑色 Drop Shadow。

### 圆角

- 与 Personal Center 卡片系统一致。
- 约 16–20px 的大圆角方向。

### Hover / Focus

- 极浅樱粉底。
- 必须同时有文字 / 背景变化，不只依赖颜色。

### 强调项

`查看个人中心` 可作为第一主入口轻微强调：

- 浅珊瑚 / 樱粉背景
- 深朱红文字与图标

但不做高饱和实心红按钮。

### 退出登录

- 默认仍使用普通中性色。
- Hover 时才可轻微使用警示色。
- 不在静止状态下抢视觉焦点。

---

## 8. Personal Content Area

Content Area 是 Shell 中唯一被各业务页面替换的区域。

### 8.1 背景

继续使用 WBS 1.21 冻结的底图规则：

- 温暖米白 / 象牙白。
- 极淡和纸纹理。
- 淡粉水彩云雾 / 花瓣感。
- 少量青海波 / 金粉细节。

禁止：

- 富士山大背景
- 大鸟居大背景
- 寺庙 / 五重塔大背景
- 中文 / 日文书法装饰文字
- 多组日式符号同时出现

### 8.2 内容层级

页面内容可以使用：

- 写实目的地照片
- 浅色卡片
- 表单 / 控件
- 本页自己的页面标题

但不得修改 Shell 的 Sidebar 结构。

---

## 9. Shell 页面切换规则

### 9.1 Home → Trips

```text
固定：Sidebar / TopActions / Background
变化：
- Active Nav 从“我的首页”切换为“我的旅行”
- Content Area 替换为 Trips 页面
```

### 9.2 Home → Preferences

```text
固定：Sidebar / TopActions / Background
变化：
- Active Nav → 旅行偏好
- Content Area → Preferences
```

### 9.3 Home → Companions / Account

同样只切换：

- Active Nav
- Content Area

禁止每个页面创建一套独立 Sidebar。

---

## 10. 与主系统 Header 的边界

主系统首页 / Planner 中：

```text
A 负责：
- Header 本身的位置与视觉
- Avatar Trigger 在 Header 中的摆放

B 负责：
- 登录后的 Avatar Popover 内容
- 点击“查看个人中心”后的目标
- Personal Center Shell
```

因此 A/B 对接 Contract 只需要明确：

```text
AvatarTrigger
→ open AvatarPopover
→ route to PersonalCenter target
```

避免双方同时修改同一 Header 布局。

---

## 11. 状态与交互

### Avatar Popover

需要支持：

- Closed
- Open
- Hover Item
- Keyboard Focus

关闭方式：

- 再次点击 Avatar Trigger
- 点击 Popover 外部
- `Esc`
- 导航跳转完成

### Sidebar Nav

需要支持：

- Default
- Hover
- Active
- Keyboard Focus

### Loading

Shell 自身优先稳定显示。

如果页面数据加载：

- Sidebar 不做 Skeleton。
- TopActions 不整体闪烁。
- 只在 Content Area 显示对应 Loading。

详细 Loading / Error 视觉归 WBS 1.29。

---

## 12. 可访问性基线

- Avatar Trigger 必须有 accessible label，例如 `打开账户菜单`。
- Popover 打开后键盘可以移动到菜单项。
- `Esc` 可关闭 Popover。
- Popover 关闭后焦点返回 Avatar Trigger。
- 当前 Sidebar 页面不仅通过颜色表达，还应使用 `aria-current="page"` 或等价语义。
- 图标必须配合可读文字，不使用纯图标表示主要导航。
- 退出登录等操作必须提供清晰文字。

---

## 13. Responsive 边界

本 WBS 冻结 Desktop Shell 逻辑，不冻结 Mobile 最终布局。

### Desktop

- 左侧固定 Sidebar。
- 右上 TopActions。
- Avatar Popover 向下展开。

### Tablet / Mobile

业务语义保持：

```text
Brand / User
Home / Trips / Preferences / Companions / Account
Top Actions
Avatar Popover 内容
```

但 Sidebar 可以转为：

- Drawer
- Bottom Navigation
- Compact Rail

详细规则归 WBS 1.29。

---

## 14. 组件建议

```text
PersonalCenterShell
├── PersonalSidebar
│   ├── PersonalBrand
│   ├── UserSummary
│   ├── PersonalNav
│   │   └── PersonalNavItem[]
│   └── SidebarTravelArtwork
│
├── PersonalTopActions
│   ├── NotificationButton
│   └── AvatarMenuTrigger
│       └── AvatarPopover
│           ├── AvatarPopoverHeader
│           ├── AvatarPopoverPrimaryAction
│           ├── AvatarPopoverNavItems
│           └── LogoutAction
│
└── PersonalContentArea
```

实现时不允许各页面复制 `PersonalSidebar`。

---

## 15. Codex / 实现约束

1. `PersonalCenterShell` 必须是个人中心页面共用 Layout。
2. 五个一级导航不得因具体页面需求随意增删。
3. 左侧鸟居水景插画区域必须保留。
4. 主内容背景不得增加富士山、大寺庙或装饰文字。
5. Avatar Popover 保持轻量，禁止塞入完整个人中心所有功能。
6. 草稿 / 历史 / 收藏继续归 `我的旅行`，不加入头像一级菜单。
7. `旅行灵感 / 我的收藏 / 目的地探索` 属于首页“更多功能模块”，不加入 Sidebar 一级导航；其中“我的收藏”可路由到 `我的旅行 > 收藏`。
8. 旅行照片继续采用写实风格；Shell 装饰继续使用轻水彩 / 和纸语言。
9. 颜色使用语义 Token，不把概念图具体 RGB 直接作为全局业务色硬编码。
10. 不使用传统 Admin Dashboard Sidebar 模板替代本设计。

---

## 16. WBS 1.22 Acceptance Checklist

- [x] Avatar Popover 信息结构确定
- [x] Avatar Popover 快捷入口范围确定
- [x] 退出登录位置确定
- [x] Personal Center Shell 固定区域确定
- [x] Sidebar 五个一级入口保持与 1.21 一致
- [x] Sidebar 底部鸟居水景插画保留
- [x] Sidebar Avatar 与 Top-right Avatar 职责区分
- [x] TopActions 仅保留通知和头像入口
- [x] Content Area 作为唯一业务内容切换区域
- [x] 主背景延续方案 D 并保持减法原则
- [x] 页面切换时 Shell 保持稳定
- [x] 主系统 Header 与个人中心 Avatar Popover 的 A/B 边界明确
- [x] 基础键盘 / 焦点规则明确

---

## 17. 最终冻结结论

WBS 1.22 的正式结论：

> **TravelAssist Personal Center 使用统一 Shell：左侧固定品牌 / 用户 / 五项一级导航 / 鸟居水景插画，右上只保留通知与头像菜单，右侧 Content Area 根据页面切换。头像菜单采用轻量暖米白 Popover，提供“查看个人中心、我的旅行、旅行偏好、同行人、账户设置、退出登录”六类快捷操作。Shell 延续方案 D 的暖米白、浅樱粉、轻和纸与低对比视觉，不复制传统后台侧栏。**
