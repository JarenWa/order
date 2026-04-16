'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  const { recordId, userId } = event;

  // 参数校验
  if (!recordId || typeof recordId !== 'string') {
    return { code: 1, message: '记录ID无效' };
  }
  if (!userId) {
    return { code: 1, message: '用户ID无效' };
  }

  try {
    // 查询记录并校验归属
    const recordRes = await db.collection('exchange_records').doc(recordId).get();
    const record = recordRes.data[0];
    if (!record) {
      return { code: 1, message: '兑换记录不存在' };
    }
    if (record.user_id !== userId) {
      return { code: 1, message: '无权操作' };
    }
    if (record.status !== 1) {
      return { code: 1, message: '当前状态不可确认收货' };
    }

    // 更新状态为已收货
    await db.collection('exchange_records').doc(recordId).update({
      status: 2,
      update_date: Date.now()
    });

    return { code: 0, message: '确认收货成功' };
  } catch (err) {
    console.error(err);
    return { code: 1, message: err.message || '操作失败' };
  }
};