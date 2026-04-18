'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  // 权限校验：仅管理员可调用
  const { ROLE } = context;
  if (!ROLE || !ROLE.includes('admin')) {
    return { code: 403, message: '无权限操作' };
  }

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

  // 2. 校验库存并准备库存更新操作
  const stockUpdates = [];
  const goodsIds = [...new Set([...Object.keys(oldGoodsMap), ...Object.keys(newGoodsMap)])];

  for (const goodId of goodsIds) {
    const oldItem = oldGoodsMap[goodId];
    const newItem = newGoodsMap[goodId];

    const oldCount = oldItem ? oldItem.count : 0;
    const newCount = newItem ? newItem.count : 0;

    if (oldCount === newCount) continue; // 数量未变，无需处理库存

    // 查询商品当前库存
    const goodRes = await db.collection('opendb-mall-goods').doc(goodId).get();
    const good = goodRes.data[0];
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
      });
    }
  }

  // 3. 执行库存更新（原子操作）
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

  // 4. 重新计算订单总金额和积分
  let totalAmount = 0;
  const newGoodsList = goodsList.map(item => {
    const good = order.goods_list.find(g => g.good_id === item.good_id) || {};
    const total = item.price * item.count;
    totalAmount += total;
    return {
      good_id: item.good_id,
      name: good.name || '未知商品',
      standard: good.standard || '',
      price: item.price,
      count: item.count,
      total: total,
      image: good.image || '',
    };
  });

  const scoreEarned = Math.ceil(totalAmount / 100); 

  // 5. 更新订单
  await db.collection('uni-pay-orders').doc(orderId).update({
    goods_list: newGoodsList,
    total_amount: totalAmount,
    actual_payment: totalAmount,
    score_earned: scoreEarned,
    update_date: Date.now(),
	admin_modified: true   // 标记后台修改过
  });

  return {
    code: 0,
    message: '订单修改成功',
  };
};