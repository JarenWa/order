'use strict';

const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
  const { userId } = event;

  if (!userId) {
    return {
      code: 400,
      message: 'userId 不能为空'
    };
  }

  try {
    // 查询各状态订单数量
    const allRes = await db.collection('uni-pay-orders').where({ user_id: userId }).count();
    const status0Res = await db.collection('uni-pay-orders').where({ user_id: userId, status: 0 }).count();
    const status1Res = await db.collection('uni-pay-orders').where({ user_id: userId, status: 1 }).count();
    const status2Res = await db.collection('uni-pay-orders').where({ user_id: userId, status: 2 }).count();
    const status3Res = await db.collection('uni-pay-orders').where({ user_id: userId, status: 3 }).count();

    // 计算待获积分（状态0和1的订单积分和）
    const pendingRes = await db.collection('uni-pay-orders')
      .where({
        user_id: userId,
        status: dbCmd.in([0, 1])
      })
      .get();

    const pendingOrders = pendingRes?.data || [];
    let pendingScore = 0;
    pendingOrders.forEach(item => {
      pendingScore += item.score_earned || 0;
    });

    return {
      code: 0,
      orderCount: {
        all: allRes.total || 0,
        status0: status0Res.total || 0,
        status1: status1Res.total || 0,
        status2: status2Res.total || 0,
        status3: status3Res.total || 0
      },
      pendingScore: pendingScore
    };
  } catch (err) {
    console.error('获取订单统计失败', err);
    return {
      code: 500,
      message: '获取订单统计失败',
      error: err.message
    };
  }
};

