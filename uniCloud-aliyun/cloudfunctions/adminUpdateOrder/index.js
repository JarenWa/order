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
  
  // 统一将 count 和 price 转为数字，防止客户端传字符串
  const normalizedGoodsList = goodsList.map(item => ({
    ...item,
    count: Number(item.count) || 0,
    price: Number(item.price) || 0,
  }));

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
    normalizedGoodsList.forEach(item => {
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
	  
	  const oldCount = Number(oldItem ? oldItem.count : 0);
	  const newCount = Number(newItem ? newItem.count : 0);

      

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
    const newGoodsList = normalizedGoodsList.map(item => {
      const good = order.goods_list.find(g => g.good_id === item.good_id) || {};
      const count = Number(item.count) || 0;
      const price = Number(item.price) || 0;
      const total = price * count;
      totalAmount += total;
      return {
        good_id: item.good_id,
        sku: good.sku || '',
        name: good.name || '未知商品',
        standard: good.standard || '',
        price: price,
        original_price: good.original_price || 0,
        count: count,
        total: total,
        image: good.image || '',
      };
    });

    const scoreEarned = Math.ceil(totalAmount / 100);

    // 4. 事务外预计算批次变动计划（普通订单）
    const batchPlans = {};
    if (!order.is_pre_order) {
      for (const { goodId, delta } of stockUpdates) {
        if (delta > 0) {
          const batchRes = await db.collection('goods_stock_batch')
            .where({ product_id: goodId })
            .orderBy('production_date', 'desc')
            .get();
          const batches = batchRes.data || [];
          let remaining = delta;
          const plan = [];
          for (const batch of batches) {
            if (remaining <= 0) break;
            const space = (batch.initial_qty || 0) - batch.remain_qty;
            if (space <= 0) continue;
            const add = Math.min(remaining, space);
            remaining -= add;
            plan.push({ _id: batch._id, add });
          }
          batchPlans[goodId] = {
            type: 'add',
            plan,
            needCreate: remaining > 0,
            remain: remaining
          };
        } else if (delta < 0) {
          const deductQty = Math.abs(delta);
          const batchRes = await db.collection('goods_stock_batch')
            .where({ product_id: goodId, remain_qty: dbCmd.gt(0) })
            .orderBy('production_date', 'asc')
            .get();
          const batches = batchRes.data || [];
          let remaining = deductQty;
          const plan = [];
          for (const batch of batches) {
            if (remaining <= 0) break;
            const d = Math.min(remaining, batch.remain_qty);
            remaining -= d;
            plan.push({ _id: batch._id, deduct: d });
          }
          if (remaining > 0) {
            return { code: 400, message: `商品 ${goodsInfoMap[goodId].name} 批次库存不足` };
          }
          // 计算新的生产日期
          let newCurrentDate = '';
          for (const batch of batches) {
            const finalQty = batch.remain_qty - (plan.find(p => p._id === batch._id)?.deduct || 0);
            if (finalQty > 0) {
              newCurrentDate = batch.production_date;
              break;
            }
          }
          batchPlans[goodId] = {
            type: 'deduct',
            plan,
            newCurrentDate
          };
        }
      }
    }

    // 5. 使用事务执行写操作（事务内无查询）
    const transaction = await db.startTransaction();
    try {
      for (const { goodId, delta, sku } of stockUpdates) {
        const good = goodsInfoMap[goodId];
        const beforeCount = good.remain_count;
        const afterCount = beforeCount + delta;
        const plan = batchPlans[goodId];

        // 5.1 更新商品总库存
        const goodsUpdate = {
          remain_count: dbCmd.inc(delta),
          updated_at: Date.now()
        };
        if (!order.is_pre_order && plan && plan.newCurrentDate !== undefined) {
          goodsUpdate.current_production_date = plan.newCurrentDate;
        }
        await transaction.collection('goods').doc(goodId).update(goodsUpdate);

        if (!order.is_pre_order) {
          if (delta > 0 && plan) {
            if (plan.plan && plan.plan.length > 0) {
              for (const p of plan.plan) {
                await transaction.collection('goods_stock_batch').doc(p._id).update({
                  remain_qty: dbCmd.inc(p.add),
                  updated_at: Date.now()
                });
              }
            }
            if (plan.needCreate && plan.remain > 0) {
              await transaction.collection('goods_stock_batch').add({
                product_id: goodId,
                production_date: '',
                batch_no: 'B' + Date.now().toString(36).toUpperCase(),
                remain_qty: plan.remain,
                initial_qty: plan.remain,
                unit_cost: 0,
                created_at: Date.now()
              });
            }
          } else if (delta < 0 && plan) {
            for (const p of plan.plan) {
              await transaction.collection('goods_stock_batch').doc(p._id).update({
                remain_qty: dbCmd.inc(-p.deduct),
                updated_at: Date.now()
              });
            }
          }
        }

        // 5.2 写入流水
        await transaction.collection('stock_flow').add({
          sku: sku || good.sku || '',
          product_id: goodId,
          type: order.is_pre_order ? 'pre_order_adjust' : 'adjust',
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

      // 异步更新 current_production_date（仅普通订单）
      if (!order.is_pre_order) {
        for (const { goodId } of stockUpdates) {
          try {
            const batchRes = await db.collection('goods_stock_batch')
              .where({ product_id: goodId, remain_qty: dbCmd.gt(0) })
              .orderBy('production_date', 'asc')
              .limit(1)
              .get();
            const currentDate = (batchRes.data && batchRes.data.length > 0)
              ? batchRes.data[0].production_date
              : '';
            await db.collection('goods').doc(goodId).update({
              current_production_date: currentDate
            });
          } catch (e) {
            console.warn('更新生产日期失败', goodId, e);
          }
        }
      }

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