'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { recordId, userId } = event;
  const transaction = await db.startTransaction();
  try {
    const recordRes = await transaction.collection('exchange_records').doc(recordId).get();
    const record = recordRes.data;
    if (!record) throw new Error('记录不存在');
    if (record.user_id !== userId) throw new Error('无权操作');
    if (record.status !== 0) throw new Error('只有待发货状态可取消');

    // 退回积分
    await transaction.collection('uni-id-users').doc(userId).update({
      score: dbCmd.inc(record.points_used)
    });
    // 恢复库存
    await transaction.collection('exchange_goods').doc(record.goods_id).update({
      stock: dbCmd.inc(record.quantity)
    });
    // 更新记录状态
    await transaction.collection('exchange_records').doc(recordId).update({
      status: 3,
      admin_cancelled: false, // 用户自己取消，非后台
      cancel_date: Date.now(),
      update_date: Date.now()
    });
    await transaction.commit();
    return { code: 0, message: '取消成功' };
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    return { code: 1, message: err.message || '取消失败' };
  }
};