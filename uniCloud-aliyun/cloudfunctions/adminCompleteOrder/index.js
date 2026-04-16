'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { orderId, userId, scoreEarned } = event;
  if (!orderId || !userId) {
    return { code: 400, message: '参数错误' };
  }

  // 查询订单，确保状态为1（配送中）
  const orderRes = await db.collection('uni-pay-orders').doc(orderId).get();
  const order = orderRes.data[0];
  if (!order) {
    return { code: 404, message: '订单不存在' };
  }
  if (order.status !== 1) {
    return { code: 400, message: '当前状态不能完成' };
  }

  // 更新订单状态为已收货，并标记后台完成
  await db.collection('uni-pay-orders').doc(orderId).update({
    status: 2,
    admin_completed: true,
    update_date: Date.now()
  });

  // 发放积分给用户
  await db.collection('uni-id-users').doc(userId).update({
    score: dbCmd.inc(scoreEarned)
  });

  // 更新商品销量：遍历订单中的商品列表
  if (order.goods_list && Array.isArray(order.goods_list)) {
    const updatePromises = order.goods_list.map(item => {
      // 确保 count 是数字类型
      const count = Number(item.count);
      if (isNaN(count) || count <= 0) {
        console.warn(`商品 ${item.good_id} 的销量无效:`, item.count);
        return Promise.resolve(); // 跳过无效数据
      }
      return db.collection('opendb-mall-goods').doc(item.good_id).update({
        total_sell_count: dbCmd.inc(count)
      });
    });
    await Promise.all(updatePromises);
  }

  return { code: 0, message: '订单已完成，积分已发放' };
};