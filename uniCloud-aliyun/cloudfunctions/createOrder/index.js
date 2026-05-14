'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { userId, addressId, selectedItems, remark, isPreOrder = false } = event;

  console.log('接收参数:', JSON.stringify({ userId, addressId, selectedItems, remark, isPreOrder }));

  // 参数基础校验
  if (!userId || typeof userId !== 'string') {
    return { code: 400, message: 'userId 必须为字符串' };
  }
  if (!addressId || typeof addressId !== 'string') {
    return { code: 400, message: 'addressId 必须为字符串' };
  }
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
    return { code: 400, message: '商品数据必须为非空数组' };
  }

  // 校验每个商品项
  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];
    if (!item || typeof item !== 'object') {
      return { code: 400, message: `商品项 ${i} 不是有效对象` };
    }
    if (!item.good_id || typeof item.good_id !== 'string') {
      return { code: 400, message: `商品项 ${i} 缺少 good_id 或类型错误` };
    }
    if (typeof item.good_count !== 'number' || item.good_count <= 0) {
      return { code: 400, message: `商品项 ${i} 的数量必须为正整数` };
    }
  }

  try {
    // 1. 获取地址信息（事务外）
    const addressRes = await db.collection('uni-id-address').doc(addressId).get();
	console.log('完整地址数据:', JSON.stringify(addressRes.data[0], null, 2))
    const address = addressRes.data[0];
    if (!address) {
      return { code: 404, message: '地址不存在' };
    }

    // 2. 获取商品最新信息（事务外）
    const goodIds = selectedItems.map(item => item.good_id);
    const goodsRes = await db.collection('goods')
      .where({ _id: dbCmd.in(goodIds) })
      .field({
        _id: true,
        sku: true,
        name: true,
        standard: true,
        goods_price: true,
        original_price: true,
        goods_thumb: true,
        remain_count: true
      })
      .get();

    const goodsMap = {};
    goodsRes.data.forEach(g => { goodsMap[g._id] = g; });

    const orderGoods = [];
    let totalAmount = 0; // 单位：分

    // 3. 校验库存（事务外）
    for (const item of selectedItems) {
      const good = goodsMap[item.good_id];
      if (!good) {
        return { code: 400, message: `商品 ${item.goodsInfo?.name || ''} 已下架或不存在` };
      }
      if (good.remain_count < item.good_count) {
        return { code: 400, message: `商品 ${good.name} 库存不足，当前库存 ${good.remain_count}` };
      }
      const total = good.goods_price * item.good_count;
      totalAmount += total;

      orderGoods.push({
        good_id: good._id,
        sku: good.sku || '',
        name: good.name,
        standard: good.standard || '',
        price: good.goods_price,
        original_price: good.original_price || 0,
        count: item.good_count,
        total: total,
        image: good.goods_thumb || ''
      });
    }

    // 4. 积分计算（存储的积分*100，实际每元积0.01积分，存储整数）
    const scoreEarned = Math.ceil(totalAmount / 100);

    // 5. 生成订单号
    const orderNo = 'ORD' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    // 6. 组装订单数据
    const orderData = {
      order_no: orderNo,
      user_id: userId,
   
      user_address: {
          mobile: address.mobile,
          street_name: address.street_name || '',
          street_code: address.street_code || '',
          user_name: address.name || address.consignee || '',
          addstr: address.address || '',
          formatted_address: address.formatted_address || '',
          alias: address.alias || ''
        },
	  
      total_amount: totalAmount,
      //actual_payment: totalAmount,
      score_earned: scoreEarned,
      status: 0,
      goods_list: orderGoods,
      remark: remark || '',
      create_date: Date.now(),
      update_date: Date.now(),
      is_pre_order: isPreOrder
    };

    // 7. 使用事务执行写操作
    const transaction = await db.startTransaction();
    try {
      const orderRes = await transaction.collection('uni-pay-orders').add(orderData);

      // 8. 原子扣减库存 + 记录流水（事务中）
      for (const item of selectedItems) {
        const good = goodsMap[item.good_id];
        const newRemain = good.remain_count - item.good_count;

        await transaction.collection('goods').doc(item.good_id).update({
          remain_count: dbCmd.inc(-item.good_count),
          updated_at: Date.now()
        });

        await transaction.collection('stock_flow').add({
          sku: good.sku || '',
          product_id: item.good_id,
          type: 'order',
          quantity: -item.good_count,
          before_count: good.remain_count,
          after_count: newRemain,
          order_id: orderRes.id,
          operator: 'system',
          remark: `订单创建: ${orderNo}`,
          created_at: Date.now()
        });
      }

      await transaction.commit();

      // 9. 事务提交成功后，删除购物车中已下单的商品（事务外，阿里云事务不支持 remove）
      if (!isPreOrder) {
        const cartIds = selectedItems.map(item => item._id).filter(id => id);
        if (cartIds.length > 0) {
          try {
            await db.collection('my_cart').where({ _id: dbCmd.in(cartIds) }).remove();
          } catch (cartErr) {
            console.warn('购物车清理失败（非关键）', cartErr);
          }
        }
      }

      return {
        code: 0,
        message: '订单创建成功',
        data: { orderId: orderRes.id, orderNo }
      };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  } catch (e) {
    console.error('订单创建失败', e);
    return { code: 500, message: '订单创建失败: ' + e.message };
  }
};
