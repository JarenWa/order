'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { recordId, userId } = event;

  try {
    // 查询记录（事务外）
    const recordRes = await db.collection('exchange_records').doc(recordId).get();
    const record = recordRes.data;
    if (!record) throw new Error('记录不存在');
    if (record.user_id !== userId) throw new Error('无权操作');
    if (record.status !== 0) throw new Error('只有待发货状态可取消');

    // 使用事务执行写操作
    const transaction = await db.startTransaction();
    try {
      await transaction.collection('uni-id-users').doc(userId).update({
        score: dbCmd.inc(record.points_used)
      });
      await transaction.collection('exchange_goods').doc(record.goods_id).update({
        stock: dbCmd.inc(record.quantity)
      });
      await transaction.collection('exchange_records').doc(recordId).update({
        status: 3,
        admin_cancelled: false,
        cancel_date: Date.now(),
        update_date: Date.now()
      });
      await transaction.commit();
      return { code: 0, message: '取消成功' };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error(err);
    return { code: 1, message: err.message || '取消失败' };
  }
};
