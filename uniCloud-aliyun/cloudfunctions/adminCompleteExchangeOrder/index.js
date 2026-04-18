'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  // 权限校验：仅管理员可调用
  const { ROLE } = context;
  if (!ROLE || !ROLE.includes('admin')) {
    return { code: 403, message: '无权限操作' };
  }

  const { recordId } = event;
  try {
    const recordRes = await db.collection('exchange_records').doc(recordId).get();
    const record = recordRes.data[0];
    if (!record) throw new Error('记录不存在');
    if (record.status !== 1) throw new Error('当前状态不可确认收货');

    await db.collection('exchange_records').doc(recordId).update({
      status: 2,
      admin_completed: true,
      update_date: Date.now()
    });
    return { code: 0, message: '已确认收货' };
  } catch (err) {
    console.error(err);
    return { code: 1, message: err.message };
  }
};