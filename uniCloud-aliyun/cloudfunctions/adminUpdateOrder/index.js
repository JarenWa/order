'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  // 权限校验：仅管理员可调用
  const { ROLE } = context;
  
  // 前端修改版未发版 暂时注释掉二次确认管理员
  // if (!ROLE || !ROLE.includes('admin')) {
  //   return { code: 403, message: '无权限操作' };
  // }

  const { orderId, goodsList } = event;
  if (!orderId || !Array.isArray(goodsList)) {
    return { code: 400, message: '参数错误' };
  }

  try {
    // 1. 获取原订单（事务外）
    const orderRes = await db.collection('uni-pay-orders').doc(orderId).get();
    const order = orderRes.data[0];
    if (!order) {
      return { code: 404, message: '订单不存在' };
    }
    // 仅允许修改待发货订单
    if (order.status !== 0) {
      return { code: 400, message: '当前订单状态不可修改' };
    }

    // 构建新旧商品映射
    const oldGoodsMap = {};
    order.goods_list.forEach(item => {
      oldGoodsMap[item.good_id] = item;
    });

    const newGoodsMap = {};
    goodsList.forEach(item => {
      newGoodsMap[item.good_id] = item;
    });

    // 2. 校验库存并准备库存更新操作（事务外）
    const stockUpdates = [];
    const goodsIds = [...new Set([...Object.keys(oldGoodsMap), ...Object.keys(newGoodsMap)])];

    // 查询商品当前库存
    const goodsInfoMap = {};
    for (const goodId of goodsIds) {
      const goodRes = await db.collection('goods').doc(goodId).get();
      goodsInfoMap[goodId] = goodRes.data[0];
    }

    for (const goodId of goodsIds) {
      const oldItem = oldGoodsMap[goodId];
      const newItem = newGoodsMap[goodId];

      const oldCount = oldItem ? oldItem.count : 0;
      const newCount = newItem ? newItem.count : 0;

      if (oldCount === newCount) continue;

      const good = goodsInfoMap[goodId];
      if (!good) {
        return { code: 400, message: `商品 ${oldItem?.name || ''} 不存在` };
      }

      // 计算修改后占用的库存变化：新数量 - 原数量
      // 原库存中已经包含了原订单占用的 oldCount，所以可用库存 = good.remain_count + oldCount
      const availableStock = good.remain_count + oldCount;
      if (newCount > availableStock) {
        return { code: 400, message: `商品 ${good.name} 库存不足，当前可分配库存为 ${availableStock}` };
      }

      // 库存变化量 = oldCount - newCount（正数表示需要增加库存，负数表示扣减）
      const delta = oldCount - newCount;
      if (delta !== 0) {
        stockUpdates.push({
          goodId,
          delta,
          oldCount,
          newCount,
          sku: good.sku || ''
        });
      }
    }

    // 3. 重新计算订单总金额和积分
    let totalAmount = 0;
    const newGoodsList = goodsList.map(item => {
      const good = order.goods_list.find(g => g.good_id === item.good_id) || {};
      const total = item.price * item.count;
      totalAmount += total;
      return {
        good_id: item.good_id,
        sku: good.sku || '',
        name: good.name || '未知商品',
        standard: good.standard || '',
        price: item.price,
        original_price: good.original_price || 0,
        count: item.count,
        total: total,
        image: good.image || '',
      };
    });

    const scoreEarned = Math.ceil(totalAmount / 100);

    // 4. 使用事务执行写操作
    const transaction = await db.startTransaction();
    try {
      for (const { goodId, delta, sku } of stockUpdates) {
        const good = goodsInfoMap[goodId];
        const beforeCount = good.remain_count;
        const afterCount = beforeCount + delta;

        await transaction.collection('goods').doc(goodId).update({
          remain_count: dbCmd.inc(delta),
          updated_at: Date.now()
        });

        await transaction.collection('stock_flow').add({
          sku: sku || good.sku || '',
          product_id: goodId,
          type: 'adjust',
          quantity: delta,
          before_count: beforeCount,
          after_count: afterCount,
          operator: 'admin',
          remark: `订单修改: ${orderId}`,
          created_at: Date.now()
        });
      }

      await transaction.collection('uni-pay-orders').doc(orderId).update({
        goods_list: newGoodsList,
        total_amount: totalAmount,
        actual_payment: totalAmount,
        score_earned: scoreEarned,
        update_date: Date.now(),
        admin_modified: true
      });

      await transaction.commit();

      return {
        code: 0,
        message: '订单修改成功',
      };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  } catch (e) {
    console.error('订单修改失败', e);
    return { code: 500, message: '订单修改失败: ' + e.message };
  }
};
