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

    // 查询订单对应的 stock_flow 扣减记录，获取 batch_info
    const flowRes = await db.collection('stock_flow')
      .where({ order_id: orderId, type: 'order' })
      .get();
    const flowMap = {};
    (flowRes.data || []).forEach(f => {
      flowMap[f.product_id] = f.batch_info || [];
    });

    // 事务外：计算每个商品需要恢复的批次计划
    const restorePlans = {};
    const productIds = order.goods_list.map(item => item.good_id);

    for (const pid of productIds) {
      const batchInfo = flowMap[pid] || [];
      const updateMap = {};
      let restored = 0;

      if (batchInfo.length > 0) {
        for (const info of batchInfo) {
          if (!info.batch_id || !info.deduct) continue;
          updateMap[info.batch_id] = (updateMap[info.batch_id] || 0) + info.deduct;
          restored += info.deduct;
        }
      }

      const goodItem = order.goods_list.find(i => i.good_id === pid);
      const totalRestore = goodItem ? goodItem.count : 0;
      const remain = totalRestore - restored;

      // 剩余部分按从新到旧顺序回填（优先填充最新批次）
      let left = remain;
      if (left > 0) {
        const batchRes = await db.collection('goods_stock_batch')
          .where({ product_id: pid })
          .orderBy('production_date', 'desc')
          .get();
        for (const batch of (batchRes.data || [])) {
          if (left <= 0) break;
          const space = (batch.initial_qty || 0) - batch.remain_qty;
          if (space <= 0) continue;
          const add = Math.min(left, space);
          left -= add;
          updateMap[batch._id] = (updateMap[batch._id] || 0) + add;
        }
      }

      restorePlans[pid] = { updateMap, needCreate: left > 0, remain: left };
    }

    // 3. 使用事务执行写操作（事务内无查询）
    const transaction = await db.startTransaction();
    try {
      if (order.goods_list && Array.isArray(order.goods_list)) {
        for (const item of order.goods_list) {
          const good = goodsMap[item.good_id];
          if (!good) continue;

          const beforeCount = good.remain_count;
          const afterCount = beforeCount + item.count;
          const plan = restorePlans[item.good_id];

          // 3.1 恢复商品总库存
          await transaction.collection('goods').doc(item.good_id).update({
            remain_count: dbCmd.inc(item.count),
            updated_at: Date.now()
          });

          // 3.2 恢复批次库存
          for (const [batchId, addQty] of Object.entries(plan.updateMap)) {
            await transaction.collection('goods_stock_batch').doc(batchId).update({
              remain_qty: dbCmd.inc(addQty),
              updated_at: Date.now()
            });
          }

          if (plan.needCreate && plan.remain > 0) {
            await transaction.collection('goods_stock_batch').add({
              product_id: item.good_id,
              production_date: '',
              batch_no: 'B' + Date.now().toString(36).toUpperCase(),
              remain_qty: plan.remain,
              initial_qty: plan.remain,
              unit_cost: 0,
              created_at: Date.now()
            });
          }

          // 3.3 写入流水
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

      // 事务提交后：异步更新 current_production_date（事务外查询）
      for (const pid of productIds) {
        try {
          const batchRes = await db.collection('goods_stock_batch')
            .where({ product_id: pid, remain_qty: dbCmd.gt(0) })
            .orderBy('production_date', 'asc')
            .limit(1)
            .get();
          const currentDate = (batchRes.data && batchRes.data.length > 0)
            ? batchRes.data[0].production_date
            : '';
          await db.collection('goods').doc(pid).update({
            current_production_date: currentDate
          });
        } catch (e) {
          console.warn('更新生产日期失败', pid, e);
        }
      }

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
