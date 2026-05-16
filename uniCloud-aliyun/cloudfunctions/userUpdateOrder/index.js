'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { addressId, orderId, goodsList } = event;
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
    if (order.status !== 0) {
      return { code: 400, message: '当前订单状态不可修改' };
    }

    // 2. 过滤掉数量 <= 0 的商品（视为删除）
    const validGoodsList = normalizedGoodsList.filter(item => item.count > 0);
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

    // 批量查询商品最新信息（事务外）
    const goodsRes = await db.collection('goods')
      .where({ _id: dbCmd.in(goodsIds) })
      .field({ _id: true, sku: true, name: true, remain_count: true })
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

      const oldCount = Number(oldItem ? oldItem.count : 0);
      const newCount = Number(newItem ? newItem.count : 0);

      if (oldCount === newCount) {
        // 数量未变，保留原商品信息（如果存在且新数量 > 0）
        if (newCount > 0 && oldItem) {
          finalGoodsList.push({
            good_id: goodId,
            sku: oldItem.sku || '',
            name: oldItem.name,
            standard: oldItem.standard || '',
            price: oldItem.price,
            original_price: oldItem.original_price || 0,
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
        stockUpdates.push({ goodId, delta, sku: good.sku || '' });
      }

      // 如果新数量 > 0，加入最终商品列表
      if (newCount > 0) {
        // 优先使用 oldItem 中的名称和规格（快照），因为新商品可能未包含这些信息
        const base = oldItem || { name: good.name, standard: '', image: '' };
        finalGoodsList.push({
          good_id: goodId,
          sku: base.sku || '',
          name: base.name,
          standard: base.standard || '',
          price: newItem.price,
          original_price: base.original_price || 0,
          count: newCount,
          total: Number(newItem.price) * newCount,
          image: base.image || '',
        });
      }
      // 如果 newCount === 0，则从订单中移除（不加入 finalGoodsList）
    }

    // 4. 重新计算订单总金额和积分
    let totalAmount = 0;
    finalGoodsList.forEach(item => {
      totalAmount += Number(item.total) || 0;
    });
    const scoreEarned = Math.ceil(totalAmount / 100);

    // 5. 事务外预计算批次变动计划
    const batchPlans = {};
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

    // 6. 使用事务执行写操作（事务内无查询）
    const transaction = await db.startTransaction();
    try {
      for (const { goodId, delta, sku } of stockUpdates) {
        const good = goodsInfoMap[goodId];
        const beforeCount = good.remain_count;
        const afterCount = beforeCount + delta;
        const plan = batchPlans[goodId];

        const goodsUpdate = {
          remain_count: dbCmd.inc(delta),
          updated_at: Date.now()
        };
        if (plan && plan.newCurrentDate !== undefined) {
          goodsUpdate.current_production_date = plan.newCurrentDate;
        }
        await transaction.collection('goods').doc(goodId).update(goodsUpdate);

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

        await transaction.collection('stock_flow').add({
          sku: sku || good.sku || '',
          product_id: goodId,
          type: 'adjust',
          quantity: delta,
          before_count: beforeCount,
          after_count: afterCount,
          operator: 'user',
          remark: `订单修改: ${orderId}`,
          created_at: Date.now()
        });
      }

      const addressRes = await db.collection('uni-id-address').doc(addressId).get();
      const address = addressRes.data[0];

      await transaction.collection('uni-pay-orders').doc(orderId).update({
        goods_list: finalGoodsList,
        total_amount: totalAmount,
        actual_payment: totalAmount,
        score_earned: scoreEarned,
        update_date: Date.now(),
        user_address: {
            mobile: address.mobile,
            street_name: address.street_name || '',
            street_code: address.street_code || '',
            user_name: address.name || address.consignee || '',
            addstr: address.address || '',
            formatted_address: address.formatted_address || '',
            alias: address.alias || ''
          },
      });

      await transaction.commit();

      // 异步更新 current_production_date
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
