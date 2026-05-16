const db = uniCloud.database()
const dbCmd = db.command

function getDocData(res) {
  if (!res || !res.data) return null
  return Array.isArray(res.data) ? res.data[0] : res.data
}

/**
 * 事务外查询：计算 FIFO 扣减计划
 * @returns { batches: [{_id, deduct}], newCurrentDate: string }
 */
async function calcDeductPlan(product_id, qty) {
  if (!qty || qty <= 0) return { batches: [], newCurrentDate: '' }

  const batchRes = await db.collection('goods_stock_batch')
    .where({
      product_id,
      remain_qty: dbCmd.gt(0)
    })
    .orderBy('production_date', 'asc')
    .get()

  const batches = batchRes.data || []
  if (batches.length === 0) {
    throw new Error('批次库存不足')
  }

  let remaining = qty
  const plan = []

  for (const batch of batches) {
    if (remaining <= 0) break
    const deduct = Math.min(remaining, batch.remain_qty)
    remaining -= deduct
    plan.push({ _id: batch._id, deduct })
  }

  if (remaining > 0) {
    throw new Error('批次库存不足')
  }

  // 计算扣减后的新 current_production_date
  let newCurrentDate = ''
  for (const batch of batches) {
    const finalQty = batch.remain_qty - (plan.find(p => p._id === batch._id)?.deduct || 0)
    if (finalQty > 0) {
      newCurrentDate = batch.production_date
      break
    }
  }

  return { batches: plan, newCurrentDate }
}

/**
 * 事务外查询：获取某商品最早有库存的批次生产日期
 */
async function getCurrentProductionDate(product_id) {
  const batchRes = await db.collection('goods_stock_batch')
    .where({
      product_id,
      remain_qty: dbCmd.gt(0)
    })
    .orderBy('production_date', 'asc')
    .limit(1)
    .get()

  return (batchRes.data && batchRes.data.length > 0)
    ? batchRes.data[0].production_date
    : ''
}

/**
 * 事务外查询：计算从新到旧的回填计划（用于取消/改单释放库存）
 * 优先把库存回填到最新批次（initial_qty - remain_qty 的空间），依次往前
 * @returns { batches: [{_id, add}], needCreate: boolean, remain: number, newCurrentDate: string }
 */
async function calcRestorePlan(product_id, qty) {
  if (!qty || qty <= 0) return { batches: [], needCreate: false, remain: 0, newCurrentDate: '' }

  const batchRes = await db.collection('goods_stock_batch')
    .where({ product_id })
    .orderBy('production_date', 'desc')
    .get()

  const batches = batchRes.data || []
  if (batches.length === 0) {
    return { batches: [], needCreate: true, remain: qty, newCurrentDate: '' }
  }

  let remaining = qty
  const plan = []
  let minFilledDate = ''

  for (const batch of batches) {
    if (remaining <= 0) break
    const space = (batch.initial_qty || 0) - batch.remain_qty
    if (space <= 0) continue
    const add = Math.min(remaining, space)
    remaining -= add
    plan.push({ _id: batch._id, add })
    if (batch.production_date) {
      if (!minFilledDate || batch.production_date < minFilledDate) {
        minFilledDate = batch.production_date
      }
    }
  }

  return {
    batches: plan,
    needCreate: remaining > 0,
    remain: remaining,
    newCurrentDate: minFilledDate
  }
}

module.exports = {
  async _before() {
    const clientInfo = this.getClientInfo()
    this.uid = clientInfo.uid
  },

  /**
   * 通用库存变动（入库、盘点、调整、出库）
   */
  async change({ product_id, type, quantity, unit_cost, production_date, batch_no, remark }) {
    if (!product_id || !['inbound', 'check', 'adjust', 'outbound'].includes(type)) {
      throw new Error('参数错误')
    }

    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty < 0) {
      throw new Error('数量无效')
    }

    if (type === 'inbound' && !production_date) {
      throw new Error('入库必须填写生产日期')
    }

    // 查询商品（事务外）
    const goodsRes = await db.collection('goods').doc(product_id).get()
    const goods = getDocData(goodsRes)
    if (!goods) throw new Error('商品不存在')

    let newCount = goods.remain_count
    let diff = 0

    if (type === 'inbound') {
      diff = qty
      newCount = goods.remain_count + diff
    } else if (type === 'check') {
      newCount = qty
      diff = newCount - goods.remain_count
    } else if (type === 'adjust') {
      diff = qty
      newCount = Math.max(0, goods.remain_count + diff)
      diff = newCount - goods.remain_count
    } else if (type === 'outbound') {
      diff = -qty
      newCount = Math.max(0, goods.remain_count + diff)
      diff = newCount - goods.remain_count
    }

    const updateData = {
      remain_count: newCount,
      updated_at: Date.now()
    }
    if (type === 'inbound') {
      updateData.total_inbound = dbCmd.inc(qty)
    }

    const flowData = {
      sku: goods.sku || '',
      product_id,
      type,
      quantity: diff,
      before_count: goods.remain_count,
      after_count: newCount,
      operator: this.uid || 'admin',
      remark: remark || '',
      created_at: Date.now()
    }

    if (unit_cost != null && !isNaN(unit_cost)) {
      flowData.unit_cost = parseInt(unit_cost, 10)
    }
    if (production_date) {
      flowData.production_date = production_date
    }
    if (batch_no) {
      flowData.batch_no = batch_no
    } else if (type === 'inbound') {
      flowData.batch_no = 'B' + Date.now().toString(36).toUpperCase()
    }

    // ===== 事务外查询所有需要的数据 =====
    let inboundBatchId = null
    let inboundIsNew = false
    let deductPlan = null
    let restorePlan = null
    let newCurrentDate = ''

    // 入库：查询是否已有同日期批次
    if (type === 'inbound' && production_date) {
      const existRes = await db.collection('goods_stock_batch')
        .where({ product_id, production_date })
        .limit(1)
        .get()
      if (existRes.data && existRes.data.length > 0) {
        inboundBatchId = existRes.data[0]._id
      } else {
        inboundIsNew = true
      }
      newCurrentDate = await getCurrentProductionDate(product_id)
      // 如果新入库日期更早，则更新
      if (!newCurrentDate || production_date < newCurrentDate) {
        newCurrentDate = production_date
      }
    }

    // 盘点/调整/出库：需要计算批次变动
    if ((type === 'check' || type === 'adjust') && diff < 0) {
      deductPlan = await calcDeductPlan(product_id, Math.abs(diff))
      newCurrentDate = deductPlan.newCurrentDate
    }
    if (type === 'outbound' && qty > 0) {
      deductPlan = await calcDeductPlan(product_id, qty)
      newCurrentDate = deductPlan.newCurrentDate
    }
    if ((type === 'check' || type === 'adjust') && diff > 0) {
      restorePlan = await calcRestorePlan(product_id, diff)
      newCurrentDate = goods.current_production_date || ''
      if (!newCurrentDate && restorePlan.newCurrentDate) {
        newCurrentDate = restorePlan.newCurrentDate
      }
    }

    const transaction = await db.startTransaction()
    try {
      // 1. 更新商品总库存
      await transaction.collection('goods').doc(product_id).update(updateData)

      // 2. 入库时维护批次库存
      if (type === 'inbound' && production_date) {
        if (inboundBatchId) {
          await transaction.collection('goods_stock_batch').doc(inboundBatchId).update({
            remain_qty: dbCmd.inc(qty),
            initial_qty: dbCmd.inc(qty),
            updated_at: Date.now()
          })
        } else {
          await transaction.collection('goods_stock_batch').add({
            product_id,
            production_date,
            batch_no: flowData.batch_no,
            remain_qty: qty,
            initial_qty: qty,
            unit_cost: flowData.unit_cost || 0,
            created_at: Date.now()
          })
        }
      }

      // 3. 盘点/调整/出库时扣减批次
      if (deductPlan && deductPlan.batches.length > 0) {
        for (const p of deductPlan.batches) {
          await transaction.collection('goods_stock_batch').doc(p._id).update({
            remain_qty: dbCmd.inc(-p.deduct),
            updated_at: Date.now()
          })
        }
      }

      // 4. 盘点/调整增加库存时从新到旧回填
      if (restorePlan && restorePlan.batches.length > 0) {
        for (const p of restorePlan.batches) {
          await transaction.collection('goods_stock_batch').doc(p._id).update({
            remain_qty: dbCmd.inc(p.add),
            updated_at: Date.now()
          })
        }
      }
      if (restorePlan && restorePlan.needCreate && restorePlan.remain > 0) {
        await transaction.collection('goods_stock_batch').add({
          product_id,
          production_date: '',
          batch_no: 'B' + Date.now().toString(36).toUpperCase(),
          remain_qty: restorePlan.remain,
          initial_qty: restorePlan.remain,
          unit_cost: 0,
          created_at: Date.now()
        })
      }

      // 5. 同步更新当前生产日期
      if (newCurrentDate !== undefined) {
        await transaction.collection('goods').doc(product_id).update({
          current_production_date: newCurrentDate
        })
      }

      // 6. 写入流水
      await transaction.collection('stock_flow').add(flowData)
      await transaction.commit()

      return { code: 0, message: 'success', after_count: newCount }
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  },

  /**
   * 订单扣减库存（供 createOrder 等云函数调用）
   */
  async deductByOrder({ product_id, quantity, order_id }) {
    if (!product_id || !quantity || !order_id) {
      throw new Error('参数错误')
    }
    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty <= 0) {
      throw new Error('扣减数量无效')
    }

    // 查询商品（事务外）
    const goodsRes = await db.collection('goods').doc(product_id).get()
    const goods = getDocData(goodsRes)
    if (!goods) throw new Error('商品不存在')
    if (goods.remain_count < qty) throw new Error('库存不足')

    const newCount = goods.remain_count - qty

    // 事务外计算扣减计划
    const deductPlan = await calcDeductPlan(product_id, qty)

    const transaction = await db.startTransaction()
    try {
      await transaction.collection('goods').doc(product_id).update({
        remain_count: newCount,
        locked_count: dbCmd.inc(qty),
        updated_at: Date.now()
      })

      for (const p of deductPlan.batches) {
        await transaction.collection('goods_stock_batch').doc(p._id).update({
          remain_qty: dbCmd.inc(-p.deduct),
          updated_at: Date.now()
        })
      }

      await transaction.collection('goods').doc(product_id).update({
        current_production_date: deductPlan.newCurrentDate
      })

      await transaction.collection('stock_flow').add({
        sku: goods.sku || '',
        product_id,
        type: 'order',
        quantity: -qty,
        before_count: goods.remain_count,
        after_count: newCount,
        order_id,
        operator: 'system',
        remark: `订单扣减: ${order_id}`,
        batch_info: deductPlan.batches.map(b => ({ batch_id: b._id, ...b })),
        created_at: Date.now()
      })

      await transaction.commit()
      return { code: 0, after_count: newCount, batches: deductPlan.batches }
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  },

  /**
   * 恢复批次库存（供 cancelOrder 等云函数调用）
   * 按从新到旧顺序回填批次（优先填充最新批次）
   */
  async restoreBatch({ product_id, quantity, batch_info, order_id }) {
    if (!product_id || !quantity) {
      throw new Error('参数错误')
    }
    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty <= 0) {
      throw new Error('恢复数量无效')
    }

    // 事务外：先从 batch_info 精确回退到原批次
    let remaining = qty
    const updateMap = {}

    if (batch_info && Array.isArray(batch_info) && batch_info.length > 0) {
      for (const info of batch_info) {
        if (!info.batch_id || !info.deduct) continue
        updateMap[info.batch_id] = (updateMap[info.batch_id] || 0) + info.deduct
        remaining -= info.deduct
      }
    }

    // 剩余部分按从新到旧顺序回填
    let restorePlan = { batches: [], needCreate: false, remain: 0, newCurrentDate: '' }
    if (remaining > 0) {
      restorePlan = await calcRestorePlan(product_id, remaining)
      for (const p of restorePlan.batches) {
        updateMap[p._id] = (updateMap[p._id] || 0) + p.add
      }
    }

    const newCurrentDate = restorePlan.newCurrentDate || await getCurrentProductionDate(product_id)

    const transaction = await db.startTransaction()
    try {
      await transaction.collection('goods').doc(product_id).update({
        remain_count: dbCmd.inc(qty),
        updated_at: Date.now()
      })

      for (const [batchId, addQty] of Object.entries(updateMap)) {
        await transaction.collection('goods_stock_batch').doc(batchId).update({
          remain_qty: dbCmd.inc(addQty),
          updated_at: Date.now()
        })
      }

      if (restorePlan.needCreate && restorePlan.remain > 0) {
        await transaction.collection('goods_stock_batch').add({
          product_id,
          production_date: '',
          batch_no: 'B' + Date.now().toString(36).toUpperCase(),
          remain_qty: restorePlan.remain,
          initial_qty: restorePlan.remain,
          unit_cost: 0,
          created_at: Date.now()
        })
      }

      await transaction.collection('goods').doc(product_id).update({
        current_production_date: newCurrentDate
      })

      await transaction.commit()
      return { code: 0, message: '批次库存恢复成功' }
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  },

  /**
   * 调整指定批次库存
   */
  async adjustBatch({ batch_id, product_id, delta, remark }) {
    if (!batch_id || !product_id || delta == null) {
      throw new Error('参数错误')
    }
    const qty = parseInt(delta, 10)
    if (isNaN(qty) || qty === 0) {
      throw new Error('调整数量无效')
    }

    const batchRes = await db.collection('goods_stock_batch').doc(batch_id).get()
    const batch = getDocData(batchRes)
    if (!batch) throw new Error('批次不存在')
    if (batch.remain_qty + qty < 0) {
      throw new Error('调整后批次库存不能为负')
    }

    const goodsRes = await db.collection('goods').doc(product_id).get()
    const goods = getDocData(goodsRes)
    if (!goods) throw new Error('商品不存在')

    let newCurrentDate = goods.current_production_date || ''
    if (qty < 0 && batch.production_date && batch.remain_qty + qty === 0) {
      const allRes = await db.collection('goods_stock_batch')
        .where({ product_id, remain_qty: dbCmd.gt(0) })
        .orderBy('production_date', 'asc')
        .get()
      for (const b of allRes.data || []) {
        const finalQty = b._id === batch_id ? b.remain_qty + qty : b.remain_qty
        if (finalQty > 0) {
          newCurrentDate = b.production_date
          break
        }
      }
      if (!newCurrentDate) newCurrentDate = ''
    } else if (qty > 0 && batch.production_date) {
      if (!newCurrentDate || batch.production_date < newCurrentDate) {
        newCurrentDate = batch.production_date
      }
    }

    const newCount = goods.remain_count + qty

    const transaction = await db.startTransaction()
    try {
      await transaction.collection('goods_stock_batch').doc(batch_id).update({
        remain_qty: dbCmd.inc(qty),
        updated_at: Date.now()
      })

      const goodsUpdate = {
        remain_count: dbCmd.inc(qty),
        updated_at: Date.now()
      }
      if (newCurrentDate !== undefined) {
        goodsUpdate.current_production_date = newCurrentDate
      }
      await transaction.collection('goods').doc(product_id).update(goodsUpdate)

      await transaction.collection('stock_flow').add({
        sku: goods.sku || '',
        product_id,
        type: 'adjust',
        quantity: qty,
        before_count: goods.remain_count,
        after_count: newCount,
        operator: this.uid || 'admin',
        remark: remark || `批次调整: ${batch.production_date || batch.batch_no}`,
        created_at: Date.now()
      })

      await transaction.commit()
      return { code: 0, message: 'success', after_count: newCount }
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  }
}
