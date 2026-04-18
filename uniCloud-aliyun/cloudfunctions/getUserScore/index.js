'use strict';

const db = uniCloud.database();

exports.main = async (event, context) => {
  const { userId } = event;

  if (!userId) {
    return {
      code: 400,
      message: 'userId 不能为空',
      score: 0
    };
  }

  try {
    const res = await db.collection('uni-id-users')
      .doc(userId)
      .get();

    if (res.data && res.data.length > 0) {
      const userData = res.data[0];
      return {
        code: 0,
        score: userData.score || 0
      };
    } else {
      return {
        code: 404,
        message: '用户不存在',
        score: 0
      };
    }
  } catch (err) {
    console.error('获取用户积分失败', err);
    return {
      code: 500,
      message: '获取积分失败',
      error: err.message
    };
  }
};
