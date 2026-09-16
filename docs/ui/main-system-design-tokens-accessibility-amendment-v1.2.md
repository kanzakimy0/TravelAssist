# WBS 1.13 Amendment v1.2 — White-on-Coral 可访问性使用边界

> 状态：Frozen Amendment
> 日期：2026-09-12
> Parent：`docs/ui/main-system-design-tokens.md`
> WBS：1.13

## 1. 目的

保留当前已经验收并实际使用的珊瑚品牌体系，不重做品牌色：

- `--color-accent-primary: #E95B4B`
- `--color-accent-primary-hover: #D94738`

本补充关闭 1.13 最新审查中剩余的可访问性问题：普通白色文字直接放在当前珊瑚纯色上的对比度不足 4.5:1，不能默认当作普通正文 / 小字号按钮文字合规。

## 2. Frozen rule

当前已计算的纯色参考：

```text
#FFFFFF on #E95B4B = 3.46:1
#FFFFFF on #D94738 = 4.28:1
```

因此冻结以下规则：

1. `#E95B4B` 继续是品牌主色；不因本问题改回旧红棕色。
2. White-on-coral 只能用于：
   - 达到 WCAG large-text 条件的文字；或
   - 组件级实测证明实际合成背景 / 渐变最差点满足适用对比要求的场景。
3. 普通字号 / 小字号控件不得仅因“这是品牌按钮”而默认使用 white-on-`#E95B4B`。
4. 普通文字目标按至少 4.5:1 处理；不满足时必须：
   - 使用更深的实际填充 / 渐变；或
   - 使用通过验证的深色文字；或
   - 调整组件角色，但不得静默降低字号 / opacity 来规避。
5. Hover / pressed / disabled 必须分别验证；不能用 hover 的 4.28:1 推导默认态通过。
6. 照片、地图、Glass、半透明表面上的对比度必须按真实浏览器合成结果验证，纯 HEX 计算只作为预检。
7. 焦点、禁用、状态与风险信息不得只靠颜色表达。

## 3. 已验收组件的处理

本 Amendment 是 Design Token 使用规范，不直接修改已验收 Home / Start / Planner / Detail / Personal Center runtime。

现有 CTA 或小字组件如果属于 white-on-coral，应在对应后续工程 / accessibility QA 中逐组件验证；发现不满足时做局部修正，不进行全仓品牌色回滚。

## 4. Implementation handoff

未来共享 Button / CTA / Chip 等组件应在实现验收矩阵中至少记录：

```text
font-size / font-weight
actual background (including gradient)
normal / hover / focus / disabled
contrast ratio or browser evidence
large-text qualification if used
```

禁止只记录 palette HEX 后宣称所有组件通过。

## 5. 验收结论

当前珊瑚品牌基线 + 本 Amendment 共同构成 WBS 1.13 Frozen baseline。未实测的具体组件仍属于工程 QA，不再阻止 1.13 设计规格本身完成。
