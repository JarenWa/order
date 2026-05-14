# 项目问题分析与解决措施

## 1. 代码重复与可维护性

| 问题 | 影响 | 解决措施 |
|------|------|----------|
| `formatDate`、`formatAddress`、`formatPrice` 等方法在多个页面重复定义 | 修改时需多处同步，易遗漏 | 提取到 `utils/common.js` 公共工具库 |
| `getStatusText` 订单状态映射在 order/list.vue、order/detail.vue、admin 页面多处重复 | 状态文案变更时需同步修改 | 提取为公共枚举/映射表 `constants/order.js` |
| `getGoodsImage` / `getImageSrc` 图片获取逻辑在 index、list、cart、confirm 等页面重复 | 图片兜底逻辑变更时易遗漏 | 提取为公共方法 `utils/common.js` |
| 加购弹窗组件样式和逻辑在 index.vue 和 goods/list.vue 中几乎完全相同 | 维护两份代码，逻辑易分叉 | 抽取为独立组件 `components/add-to-cart-popup/add-to-cart-popup.vue` |
| 地址选择逻辑在 order/confirm.vue 和 exchange/confirm.vue 中重复 | 地址加载逻辑变更需多处修改 | 抽取为 mixin 或公共方法 |

## 2. 安全隐患

| 问题 | 影响 | 解决措施 |
|------|------|----------|
| cart/index.vue、address/select.vue 等使用字符串模板拼接 `where="user_id == '${userInfo._id}'"` | 存在 JQL 注入风险 | 改用对象式 where 条件 `{ user_id: userInfo._id }` |
| userUpdateOrder 云函数未校验当前登录用户是否为订单所有者 | 恶意用户可修改他人订单 | 云函数中增加 `order.user_id !== userId` 权限校验 |
| order/list.vue 中取消订单、删除订单直接前端调用 db.collection().update/remove() | 绕过前端校验即可操作他人数据 | 改为调用云函数，在服务端校验权限 |
| adminCompleteOrder、adminUpdateOrder 使用 `context.ROLE` 做权限校验 | 需确认 uniCloud 该字段来源可靠性 | 增加二次校验，查询 uni-id-users 表确认管理员身份 |
| 积分兑换 confirm 页面仅前端校验积分充足 | 可伪造请求绕过前端校验 | 确保 createExchangeOrder 云函数已做严格服务端校验（已具备） |

## 3. 性能问题

| 问题 | 影响 | 解决措施 |
|------|------|----------|
| user/index.vue loadOrderCount 发起 6 次独立数据库查询 | 并发量大时数据库压力大 | 改为单次聚合查询，或用云函数一次性返回统计结果 |
| index.vue、goods/list.vue 设置 10 秒定时刷新 | 不必要的网络开销，用户体验差 | 改为 onShow 时刷新，或降低频率/按需刷新 |
| order/list.vue 使用 `:where="whereCondition"` computed + unicloud-db，每次响应式变化触发重新查询 | 可能引起不必要的重复查询 | 优化响应式依赖，或使用 loadData 手动控制刷新时机 |
| Promise.all 中任一请求失败导致全部进入 catch | 部分数据无法展示 | 对每个 Promise 单独 catch 包装，隔离错误 |

## 4. UI/UE 与样式

| 问题 | 影响 | 解决措施 |
|------|------|----------|
| 所有页面重复定义 `.container { background: #f5f5f5; min-height: 100vh; }` | 样式冗余，主题切换困难 | 抽取公共样式到 `common/style/app.scss` |
| 弹窗样式在多处重复定义（popup-content、popup-btn 等） | UI 不统一，修改成本高 | 统一抽取为公共弹窗样式类或组件 |
| 商品卡片样式在 index.vue、goods/list.vue 中不一致 | 视觉体验不统一 | 抽取 `components/goods-card/goods-card.vue` 统一组件 |
| 颜色值硬编码（#ff6000、#007aff、#f5f5f5 等） | 品牌色变更时需全局替换 | 使用 CSS 变量定义主题色，在公共样式中集中管理 |
| 空状态、错误状态、加载状态各页面自行实现 | 体验不一致 | 抽取 `components/empty-state/empty-state.vue` 等公共状态组件 |
| 按钮样式不统一（圆角、高度、颜色） | 视觉体验差 | 定义统一的按钮样式类 `.btn-primary`、`.btn-warn`、`.btn-ghost` |

## 5. 逻辑缺陷

| 问题 | 影响 | 解决措施 |
|------|------|----------|
| cart/index.vue `uni.$off('cartUpdated', this.refreshCart)` 与 `uni.$on` 绑定的不是同一个函数引用 | 页面卸载后事件未正确移除，可能导致内存泄漏 | `uni.$on` 也绑定为 `this.refreshCart` 方法引用 |
| 积分计算 `Math.ceil(totalAmount / 100)` 分散在 createOrder、adminUpdateOrder、userUpdateOrder 等多个云函数 | 计算规则变更时易遗漏 | 抽取为公共云函数工具 `common/utils.js` |
| goods/list.vue 存在大量注释掉的废弃代码 | 代码可读性差 | 删除无用注释代码 |
| 定时器在页面隐藏时未正确清理（某些边界情况） | 可能导致后台持续请求 | 统一在 onHide/onUnload 中清理，并增加守护判断 |
| index.vue 中 `is_pre: false \|\| null` 查询条件写法错误 | `false \|\| null` 结果是 `null`，查询条件可能不符合预期 | 改为 `dbCmd.or([{ is_pre: false }, { is_pre: dbCmd.exists(false) }])` 或确保数据一致性 |
