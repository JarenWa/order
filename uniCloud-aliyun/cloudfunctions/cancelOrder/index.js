'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { orderId, cancelType = 'user' } = event;
  if (!orderId) {
    return { code: 400, message: '参数错误' };
  }

  try {
    // 1. 查询订单（事务外）
    const orderRes = await db.collection('uni-pay-orders').doc(orderId).get();
    const order = orderRes.data[0];
    if (!order) {
      return { code: 404, message: '订单不存在' };
    }
	
	// 管理员和普通用户能取消的订单状态不同，前端会控制，这里双重校验
    if (cancelType === 'user' && order.status !== 0) {
      return { code: 400, message: '当前订单状态不可取消' };
    }
	
	if (cancelType === 'admin' && order.status === 2) {
	  return { code: 400, message: '当前订单状态【已收货】不可取消' };
	}
	if (cancelType === 'admin' && order.status === 3) {
	  return { code: 400, message: '当前订单状态【已取消】不可取消' };
	}
	
	

    // 2. 查询商品库存（事务外）
    const goodsMap = {};
    if (order.goods_list && Array.isArray(order.goods_list)) {
      for (const item of order.goods_list) {
        const goodRes = await db.collection('goods').doc(item.good_id).get();
        goodsMap[item.good_id] = goodRes.data[0];
      }
    }

    // 3. 使用事务执行写操作
    const transaction = await db.startTransaction();
    try {
      if (order.goods_list && Array.isArray(order.goods_list)) {
        for (const item of order.goods_list) {
          const good = goodsMap[item.good_id];
          if (!good) continue;

          const beforeCount = good.remain_count;
          const afterCount = beforeCount + item.count;

          await transaction.collection('goods').doc(item.good_id).update({
            remain_count: dbCmd.inc(item.count),
            updated_at: Date.now()
          });

          await transaction.collection('stock_flow').add({
            sku: good.sku || '',
            product_id: item.good_id,
            type: 'adjust',
            quantity: item.count,
            before_count: beforeCount,
            after_count: afterCount,
            operator: cancelType === 'admin' ? 'admin' : 'user',
            remark: `订单取消回滚: ${order.order_no}`,
            created_at: Date.now()
          });
        }
      }

      const updateData = {
        status: 3,
        update_date: Date.now()
      };
      if (cancelType === 'admin') {
        updateData.admin_cancelled = true;
      }

      await transaction.collection('uni-pay-orders').doc(orderId).update(updateData);
      await transaction.commit();

      return { code: 0, message: '取消成功' };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('取消订单失败', err);
    return { code: 500, message: '取消失败: ' + err.message };
  }
};
