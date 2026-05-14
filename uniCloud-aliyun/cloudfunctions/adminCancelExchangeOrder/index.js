'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  // 权限校验：仅管理员可调用
  const { ROLE } = context;
  if (!ROLE || !ROLE.includes('admin')) {
    return { code: 403, message: '无权限操作' };
  }

  const { recordId } = event;

  try {
    // 查询记录（事务外）
    const recordRes = await db.collection('exchange_records').doc(recordId).get();
    const record = recordRes.data;
    if (!record) throw new Error('记录不存在');
    if (record.status !== 0) throw new Error('当前状态不可取消');

    // 使用事务执行写操作
    const transaction = await db.startTransaction();
    try {
      await transaction.collection('uni-id-users').doc(record.user_id).update({
        score: dbCmd.inc(record.points_used)
      });

      await transaction.collection('exchange_goods').doc(record.goods_id).update({
        stock: dbCmd.inc(record.quantity),
        update_date: Date.now()
      });

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
      throw err;
    }
  } catch (err) {
    console.error(err);
    return { code: 1, message: err.message };
  }
};
