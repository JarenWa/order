'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { orderId, goodsList } = event;
  if (!orderId || !Array.isArray(goodsList)) {
    return { code: 400, message: '参数错误' };
  }

  // 1. 获取原订单
  const orderRes = await db.collection('uni-pay-orders').doc(orderId).get();
  const order = orderRes.data[0];
  if (!order) {
    return { code: 404, message: '订单不存在' };
  }
  if (order.status !== 0) {
    return { code: 400, message: '当前订单状态不可修改' };
  }

  // 2. 过滤掉数量 <= 0 的商品（视为删除）
  const validGoodsList = goodsList.filter(item => item.count > 0);
  if (validGoodsList.length === 0) {
    return { code: 400, message: '订单至少保留一个商品' };
  }

  // 构建新旧商品映射
  const oldGoodsMap = {};
  order.goods_list.forEach(item => {
    oldGoodsMap[item.good_id] = item;
  });

  const newGoodsMap = {};
  validGoodsList.forEach(item => {
    newGoodsMap[item.good_id] = item;
  });

  // 3. 收集所有需要处理的商品ID（原订单中的和修改后的）
  const goodsIds = [...new Set([...Object.keys(oldGoodsMap), ...Object.keys(newGoodsMap)])];

  // 批量查询商品最新信息（库存、名称等）
  const goodsRes = await db.collection('opendb-mall-goods')
    .where({ _id: dbCmd.in(goodsIds) })
    .field({ _id: true, name: true, remain_count: true })
    .get();

  const goodsInfoMap = {};
  goodsRes.data.forEach(g => {
    goodsInfoMap[g._id] = g;
  });

  const stockUpdates = [];
  const finalGoodsList = [];

  for (const goodId of goodsIds) {
    const oldItem = oldGoodsMap[goodId];
    const newItem = newGoodsMap[goodId];
    const good = goodsInfoMap[goodId];

    // 如果商品不存在（数据库中被删除），则报错
    if (!good) {
      const name = oldItem?.name || newItem?.name || goodId;
      return { code: 400, message: `商品 ${name} 已不存在，无法修改` };
    }

    const oldCount = oldItem ? oldItem.count : 0;
    const newCount = newItem ? newItem.count : 0;

    if (oldCount === newCount) {
      // 数量未变，保留原商品信息（如果存在且新数量 > 0）
      if (newCount > 0 && oldItem) {
        finalGoodsList.push({
          good_id: goodId,
          name: oldItem.name,
          standard: oldItem.standard || '',
          price: oldItem.price,
          count: newCount,
          total: oldItem.price * newCount,
          image: oldItem.image || '',
        });
      }
      continue;
    }

    // 计算可用库存（当前库存 + 原订单占用量）
    const availableStock = good.remain_count + oldCount;
    if (newCount > availableStock) {
      return { code: 400, message: `商品 ${good.name} 库存不足，当前可分配库存为 ${availableStock}` };
    }

    // 库存变化量 = oldCount - newCount（正数表示释放库存，负数表示扣减）
    const delta = oldCount - newCount;
    if (delta !== 0) {
      stockUpdates.push({ goodId, delta });
    }

    // 如果新数量 > 0，加入最终商品列表
    if (newCount > 0) {
      // 优先使用 oldItem 中的名称和规格（快照），因为新商品可能未包含这些信息
      const base = oldItem || { name: good.name, standard: '', image: '' };
      finalGoodsList.push({
        good_id: goodId,
        name: base.name,
        standard: base.standard || '',
        price: newItem.price,
        count: newCount,
        total: newItem.price * newCount,
        image: base.image || '',
      });
    }
    // 如果 newCount === 0，则从订单中移除（不加入 finalGoodsList）
  }

  // 4. 执行库存更新
  if (stockUpdates.length > 0) {
    try {
      const updatePromises = stockUpdates.map(({ goodId, delta }) => {
        return db.collection('opendb-mall-goods').doc(goodId).update({
          remain_count: dbCmd.inc(delta)
        });
      });
      await Promise.all(updatePromises);
    } catch (e) {
      console.error('库存更新失败', e);
      return { code: 500, message: '库存更新失败' };
    }
  }

  // 5. 重新计算订单总金额和积分
  let totalAmount = 0;
  finalGoodsList.forEach(item => {
    totalAmount += item.total;
  });
  const scoreEarned = Math.ceil(totalAmount / 100);

  // 6. 更新订单
  await db.collection('uni-pay-orders').doc(orderId).update({
    goods_list: finalGoodsList,
    total_amount: totalAmount,
    actual_payment: totalAmount,
    score_earned: scoreEarned,
    update_date: Date.now(),
    admin_modified: true
  });

  return {
    code: 0,
    message: '订单修改成功',
  };
};