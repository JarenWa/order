function getDocData(res) {
  if (!res || !res.data) return null
  return Array.isArray(res.data) ? res.data[0] : res.data
}

module.exports = {
  async _before() {
    const clientInfo = this.getClientInfo()
    this.uid = clientInfo.uid
    this.db = uniCloud.database()
    this.dbCmd = this.db.command
  },

  /**
   * 通用库存变动（入库、盘点、调整、出库）
   * @param {Object} params
   * @param {string} params.product_id - 商品ID
   * @param {string} params.type - inbound|check|adjust|outbound
   * @param {number} params.quantity - 数量（盘点时为目标库存，调整/入库时为变动量）
   * @param {number} [params.unit_cost] - 成本单价（分）
   * @param {string} [params.production_date] - 生产日期
   * @param {string} [params.batch_no] - 批次号
   * @param {string} [params.remark] - 备注
   */
  async change({ product_id, type, quantity, unit_cost, production_date, batch_no, remark }) {
    if (!product_id || !['inbound', 'check', 'adjust', 'outbound'].includes(type)) {
      throw new Error('参数错误')
    }

    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty < 0) {
      throw new Error('数量无效')
    }

    // 查询商品（事务外）
    const goodsRes = await this.db.collection('goods').doc(product_id).get()
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
      updateData.total_inbound = this.dbCmd.inc(qty)
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

    const transaction = await this.db.startTransaction()
    try {
      await transaction.collection('goods').doc(product_id).update(updateData)
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
   * @param {Object} params
   * @param {string} params.product_id - 商品ID
   * @param {number} params.quantity - 扣减数量
   * @param {string} params.order_id - 订单ID
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
    const goodsRes = await this.db.collection('goods').doc(product_id).get()
    const goods = getDocData(goodsRes)
    if (!goods) throw new Error('商品不存在')
    if (goods.remain_count < qty) throw new Error('库存不足')

    const newCount = goods.remain_count - qty
    const transaction = await this.db.startTransaction()
    try {
      await transaction.collection('goods').doc(product_id).update({
        remain_count: newCount,
        locked_count: this.dbCmd.inc(qty),
        updated_at: Date.now()
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
        remark: '订单扣减',
        created_at: Date.now()
      })

      await transaction.commit()
      return { code: 0, after_count: newCount }
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  }
}
