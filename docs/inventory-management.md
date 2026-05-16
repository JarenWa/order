# 库存与批次管理设计文档

## 1. 概述

系统采用**批次库存（FIFO）+ 虚拟预售**双轨模型：
- **普通订单**：创建时即扣减具体批次库存，遵循 FIFO（旧批次优先出库），取消/改单释放时按从新到旧回填。
- **预售订单**：仅扣减商品总库存 `remain_count` 作为虚拟额度，不触碰具体批次；发货、取消、改单均不涉及 `goods_stock_batch`。

## 2. 数据库表结构

### 2.1 `goods`（商品主表）

| 字段 | 类型 | 说明 |
|---|---|---|
| `remain_count` | int | 当前可用库存（现货 + 预售虚拟额度） |
| `locked_count` | int | 已被订单锁定/预占的库存 |
| `total_inbound` | int | 累计入库数量 |
| `total_sold` | int | 累计售出数量 |
| `current_production_date` | string | 当前最早有库存批次的生产日期（YYYY-MM） |
| `warning_count` | int | 库存预警阈值 |

### 2.2 `goods_stock_batch`（批次库存表）

| 字段 | 类型 | 说明 |
|---|---|---|
| `product_id` | string | 关联商品 ID |
| `production_date` | string | 生产日期（YYYY-MM），用于 FIFO 排序 |
| `batch_no` | string | 批次号（如 `B8QK2P`） |
| `remain_qty` | int | 该批次剩余数量 |
| `initial_qty` | int | 该批次累计入库总数（用于计算可回填空间） |
| `unit_cost` | int | 成本单价（分） |

**关键设计**：`initial_qty` 记录批次累计入库总数。释放库存时，按 `initial_qty - remain_qty` 计算该批次的"可回填空间"，优先填充最新批次。

### 2.3 `stock_flow`（库存流水表）

| 字段 | 类型 | 说明 |
|---|---|---|
| `product_id` | string | 商品 ID |
| `type` | string | 类型：`inbound` / `order` / `pre_order` / `adjust` / `pre_order_cancel` / `pre_order_adjust` |
| `quantity` | int | 变动数量（负数为扣减） |
| `before_count` | int | 变动前总库存 |
| `after_count` | int | 变动后总库存 |
| `batch_info` | array | 批次变动明细（普通订单/入库/调整时记录） |
| `order_id` | string | 关联订单 ID |
| `remark` | string | 备注 |

## 3. 批次管理核心逻辑

### 3.1 入库（`stock-co.change` type='inbound'）

1. 查询是否已有同日期批次：
   - 若存在：合并，`remain_qty += qty`，`initial_qty += qty`
   - 若不存在：新建批次，`remain_qty = qty`，`initial_qty = qty`
2. 更新 `goods.remain_count += qty`，`total_inbound += qty`
3. 若新入库日期早于 `current_production_date`，更新之

### 3.2 出库（普通订单创建 `createOrder`）

1. 事务外预计算 FIFO 扣减计划：
   - 按 `production_date asc` 遍历有库存批次
   - 依次扣减，直到满足订单数量
2. 事务内执行：
   - `goods.remain_count -= qty`
   - 逐个扣减批次 `remain_qty`
   - 更新 `current_production_date` 为扣减后最早有库存批次
   - 写入 `stock_flow`（`type='order'`，带 `batch_info`）

### 3.3 释放/恢复（取消、改单减量）

**关键规则**：取消或改单导致库存释放时，**不按原扣减路径恢复**，而是按**从新到旧**顺序填充批次。

1. 先按 `stock_flow.batch_info` 精确回退到原批次（保持原批次信息可追溯）
2. 若还有剩余释放量，按 `production_date desc` 遍历所有批次
3. 计算每个批次的可回填空间：`initial_qty - remain_qty`
4. 优先填充**最新批次**，填满后再填次新的
5. 若所有批次都满，新建一个无日期兜底批次

**示例**：
```
批次：202505(剩余50/入库100) | 202504(剩余0/入库200) | 202503(剩余0/入库100)
取消释放 80：
  -> 先填 202505（空间50）-> 剩30
  -> 再填 202504（空间200）-> 填30
  -> 结果：202505剩余100，202504剩余30，202503剩余0
```

## 4. 预售订单特殊逻辑

### 4.1 创建预售订单（`createOrder` with `isPreOrder=true`）

- **只扣 `goods.remain_count`**，不扣 `goods_stock_batch`
- 不写 `batch_info`，流水 `type='pre_order'`
- 不更新 `current_production_date`

### 4.2 取消预售订单（`cancelOrder`）

- **只恢复 `goods.remain_count`**
- 不查询 `stock_flow.batch_info`
- 不恢复任何批次
- 流水 `type='pre_order_cancel'`

### 4.3 修改预售订单（`adminUpdateOrder` / `userUpdateOrder`）

- **只调整 `goods.remain_count`**
- 跳过所有 `goods_stock_batch` 操作
- 流水 `type='pre_order_adjust'`

### 4.4 预售发货

- 发货仅为前端状态更新（`status 4 → 1`）
- **不扣减批次库存**
- 预售商品的发货消耗由后台统一入库时补充

## 5. 云函数库存操作速查

| 云函数 | 场景 | 批次操作 | 预售是否跳过批次 |
|---|---|---|---|
| `createOrder` | 创建普通订单 | FIFO 扣减批次 | 否 |
| `createOrder` | 创建预售订单 | 不扣批次 | 是 |
| `cancelOrder` | 取消普通订单 | 按新到旧回填批次 | 否 |
| `cancelOrder` | 取消预售订单 | 不恢复批次 | 是 |
| `adminUpdateOrder` | 管理员改单 | 释放/扣减均走批次 | 是（预售跳过） |
| `userUpdateOrder` | 用户改单 | 同上 | 是（预售跳过） |
| `stock-co.change` | 入库 | 合并/新建批次 | 无预售概念 |
| `stock-co.change` | 盘点/调整/出库 | FIFO 扣减或新到旧回填 | 无预售概念 |
| `stock-co.adjustBatch` | 单批次调整 | 直接修改指定批次 | 无预售概念 |
| `stock-co.deductByOrder` | 订单扣减（供调用） | FIFO 扣减 | 无预售概念 |
| `stock-co.restoreBatch` | 批次恢复（供调用） | 先精确回退，再新到旧回填 | 无预售概念 |

## 6. 数据一致性约束

1. `goods.remain_count` 永远 >= 0（原子 `dbCmd.inc` 保证）
2. `goods_stock_batch.remain_qty` 永远 >= 0（事务内更新 + 校验）
3. `goods_stock_batch.initial_qty` >= `remain_qty`（释放回填逻辑保证不回超）
4. `current_production_date` 始终对应 `remain_qty > 0` 的最早批次
5. 预售订单不破坏约束 2 和 4，因为不触碰批次表

## 7. 事务限制（阿里云 uniCloud）

- 事务内**不支持** `.where().get()` / `.orderBy().get()` / `.limit().get()`
- 事务内**仅支持** `doc(_id).update()` / `.add()` / `.remove()`
- 所有查询必须在事务外完成，将 `_id` 和计算结果传入事务内执行

## 8. 前端页面操作说明

### 8.1 后台商品列表（`pages_admin/opendb-mall-goods/list.vue`）

- **入库**：每行商品右侧有"入库"按钮，点击弹出入库弹窗
  - 必填：入库数量、生产日期（年月选择器）
  - 可选：成本单价（元）、批次号（不填自动生成）、备注
  - 调用 `stock-co.change({ type: 'inbound', ... })`
  - 若该生产日期已存在，自动合并到现有批次（`initial_qty` 和 `remain_qty` 均增加）
- **商品列表显示**：展示 `current_production_date`（当前最早有库存批次的生产日期）

### 8.2 后台商品详情（`pages_admin/opendb-mall-goods/detail.vue`）

- **批次库存卡片**：展示该商品所有 `remain_qty > 0` 的批次，按 `production_date` 升序排列
  - 显示：生产日期、剩余数量、批次号
  - 每行右侧有"调整"按钮
- **新增批次**：卡片右上角"新增批次"按钮
  - 弹出表单：生产日期（年月）、入库数量
  - 若 detail 中已存在相同生产日期的批次（`remain_qty > 0`），提示"该生产日期批次已存在，请使用调整功能"
  - 若数据库中存在但 `remain_qty == 0`（detail 不显示），则调用 `stock-co.change` 合并到该批次
  - 调用 `stock-co.change({ type: 'inbound', ... })`
- **批次调整**：点击某批次行的"调整"按钮
  - 弹出表单：显示当前生产日期和库存，选择"增加/减少"，输入调整数量
  - 调用 `stock-co.adjustBatch({ batch_id, product_id, delta })`
  - 增加：直接加到该批次（同时更新 `goods.remain_count`）
  - 减少：从该批次扣除（同时更新 `goods.remain_count`），不允许扣到负数

### 8.3 后台普通订单列表（`pages_admin/uni-pay-orders/list.vue`）

- **订单状态流**：`0 待处理` → `4 已出单`（打印后）→ `1 配送中`（发货）→ `2 已收货`（完成）
- **发货**（`Ship` / `shipOrder`）：
  - 仅更新订单状态 `status: 1`，**不扣减批次库存**
  - 库存已在订单创建时扣除
- **打印并发货**（`printOrder`）：
  - 更新 `status: 1`，`deliver_date: Date.now()`，然后跳转到打印页面
  - **不扣减批次库存**
- **完成订单**（`adminCompleteOrder` 云函数）：
  - 仅发放积分、更新 `total_sold`，**不碰库存**

### 8.4 后台预售订单列表（`pages_admin/uni-pay-orders/pre-order-list.vue`）

- **发货**（`confirmShip` / `shipOrder`）：
  - 仅更新订单状态 `status: 1`，**不扣减批次库存**
  - 预售订单全程不触碰 `goods_stock_batch`
- **完成订单**（`completeOrder` / `adminCompleteOrder`）：
  - 仅发放积分，**不碰库存**

### 8.5 用户端订单操作

- **创建订单**（`createOrder` 云函数）：
  - 普通订单：扣减 `remain_count` + FIFO 扣减批次
  - 预售订单：仅扣减 `remain_count`
- **取消订单**（`cancelOrder` 云函数）：
  - 普通订单：恢复 `remain_count` + 按新到旧回填批次
  - 预售订单：仅恢复 `remain_count`
- **修改订单**（`userUpdateOrder` 云函数）：
  - 普通订单：调整 `remain_count` + 批次回填/扣减
  - 预售订单：仅调整 `remain_count`

## 9. 预售与普通订单的库存差异总结

| 环节 | 普通订单 | 预售订单 |
|---|---|---|
| 下单 | 扣 `remain_count` + FIFO 扣批次 | 仅扣 `remain_count` |
| 发货 | 前端改状态，不碰库存 | 前端改状态，不碰库存 |
| 取消 | 恢复 `remain_count` + 新到旧回填批次 | 仅恢复 `remain_count` |
| 改单 | 调整 `remain_count` + 批次变动 | 仅调整 `remain_count` |
| 流水类型 | `order` / `adjust` | `pre_order` / `pre_order_cancel` / `pre_order_adjust` |
| `batch_info` | 有 | 无 |
