'use strict';
const db = uniCloud.database();
const dbCmd = db.command;


exports.main = async (event, context) => {
  const { goodsId, quantity, address, remark, userId } = event;

  try {
    // 1. 查询商品（事务外）
    const goodsRes = await db.collection('exchange_goods').doc(goodsId).get();
    const goods = goodsRes.data;
    if (!goods) {
      return { code: 1, message: '商品不存在' };
    }
    if (goods.status !== 0) {
      return { code: 1, message: '商品已下架' };
    }
    if (goods.stock < quantity) {
      return { code: 1, message: '库存不足' };
    }

    // 2. 查询用户积分（事务外）
    const userRes = await db.collection('uni-id-users').doc(userId).get();
    const user = userRes.data;
    if (!user) {
      return { code: 1, message: '用户不存在' };
    }
    const requiredPoints = goods.points_required * quantity;
    if (user.score < requiredPoints) {
      return { code: 1, message: '积分不足' };
    }

    // 3. 组装数据
    const recordNo = `EX${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const recordData = {
      record_no: recordNo,
      user_id: userId,
      goods_id: goodsId,
      goods_name: goods.name,
      goods_image: goods.image,
      points_used: requiredPoints,
      quantity: quantity,
      consignee: address.consignee,
      mobile: address.mobile,
      address: address.address,
      remark: remark || '',
      status: 0,
      admin_cancelled: false,
      admin_completed: false,
      create_date: Date.now(),
      update_date: Date.now()
    };

    // 4. 使用事务执行写操作
    const transaction = await db.startTransaction();
    try {
      await transaction.collection('exchange_goods').doc(goodsId).update({
        stock: dbCmd.inc(-quantity),
        update_date: Date.now()
      });

      await transaction.collection('uni-id-users').doc(userId).update({
        score: dbCmd.inc(-requiredPoints)
      });

      await transaction.collection('exchange_records').add(recordData);

      await transaction.commit();
      return { code: 0, message: '兑换成功' };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('兑换失败:', err);
    return { code: 1, message: err.message || '兑换失败' };
  }
};
