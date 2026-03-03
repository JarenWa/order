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

  // 1. 获取地址信息
  const addressRes = await db.collection('uni-id-address').doc(addressId).get();
  const address = addressRes.data[0];
  if (!address) return { code: 404, message: '地址不存在' };

  // 2. 获取商品最新信息
  const goodIds = selectedItems.map(item => item.good_id);
  const goodsRes = await db.collection('opendb-mall-goods')
    .where({ _id: dbCmd.in(goodIds) })
    .field({
      _id: true,
      name: true,
      standard: true,
      goods_price: true,
      remain_count: true
    })
    .get();

  const goodsMap = {};
  goodsRes.data.forEach(g => { goodsMap[g._id] = g; });

  const orderGoods = [];
  let totalAmount = 0; // 单位：分

  for (const item of selectedItems) {
    const good = goodsMap[item.good_id];
    if (!good) return { code: 400, message: `商品 ${item.goodsInfo?.name || ''} 已下架或不存在` };
    if (good.remain_count < item.good_count) {
      return { code: 400, message: `商品 ${good.name} 库存不足，当前库存 ${good.remain_count}` };
    }
    const total = good.goods_price * item.good_count;
    totalAmount += total;

    orderGoods.push({
      good_id: good._id,
      name: good.name,
      standard: good.standard || '',
      price: good.goods_price,
      count: item.good_count,
      total: total
    });
  }

  // 3. 积分计算（每元积0.01分，存储整数）
  const scoreEarned = Math.ceil(totalAmount / 100);

  // 4. 生成订单号
  const orderNo = 'ORD' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  // 5. 原子扣减库存
  try {
    const stockUpdatePromises = selectedItems.map(item => {
      return db.collection('opendb-mall-goods').doc(item.good_id).update({
        remain_count: dbCmd.inc(-item.good_count)
      });
    });
    await Promise.all(stockUpdatePromises);
  } catch (e) {
    console.error('库存扣减失败', e);
    return { code: 500, message: '库存扣减失败' };
  }

  // 6. 创建订单（增加 is_pre_order 字段）
  const orderData = {
    order_no: orderNo,
    user_id: userId,
    consignee: address.name,
    mobile: address.mobile,
    address: address.formatted_address || `${address.province_name || ''}${address.city_name || ''}${address.district_name || ''}${address.street_name || ''}${address.address || ''}`,
    total_amount: totalAmount,
    actual_payment: totalAmount,
    score_earned: scoreEarned,
    status: 0,
    goods_list: orderGoods,
    remark: remark || '',
    create_date: Date.now(),
    update_date: Date.now(),
    is_pre_order: isPreOrder // 新增字段
  };

  let orderRes;
  try {
    orderRes = await db.collection('uni-pay-orders').add(orderData);
  } catch (e) {
    console.error('订单创建失败', e);
    return { code: 500, message: '订单创建失败' };
  }

  // 7. 如果不是预售订单，才删除购物车中已下单的商品
  if (!isPreOrder) {
    const cartIds = selectedItems.map(item => item._id).filter(id => id);
    if (cartIds.length > 0) {
      await db.collection('my_cart').where({ _id: dbCmd.in(cartIds) }).remove();
    }
  }

  return {
    code: 0,
    message: '订单创建成功',
    data: { orderId: orderRes.id, orderNo }
  };
};