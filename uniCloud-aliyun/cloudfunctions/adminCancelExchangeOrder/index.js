'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { recordId } = event;
  const transaction = await db.startTransaction();
  try {
    // 查询记录并锁定
    const recordRes = await transaction.collection('exchange_records').doc(recordId).get();
    const record = recordRes.data;
    if (!record) throw new Error('记录不存在');
    if (record.status !== 0) throw new Error('当前状态不可取消');

    // 退回积分
    await transaction.collection('uni-id-users').doc(record.user_id).update({
      score: dbCmd.inc(record.points_used)
    });

    // 恢复库存
    await transaction.collection('exchange_goods').doc(record.goods_id).update({
      stock: dbCmd.inc(record.quantity),
      update_date: Date.now()
    });

    // 更新记录状态
    await transaction.collection('exchange_records').doc(recordId).update({
      status: 3,
      admin_cancelled: true,
      update_date: Date.now(),
      cancel_date: Date.now()
    });

    await transaction.commit();
    return { code: 0, message: '已取消' };
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    return { code: 1, message: err.message };
  }
};