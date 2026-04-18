'use strict';
const db = uniCloud.database();
const uniIdCommon = require('uni-id-common');

exports.main = async (event, context) => {
  const { openid, phone, code } = event;

  // 参数校验
  if (!openid || !phone || !code) {
    return { code: 400, message: '参数不完整' };
  }

  if (!/^1\d{10}$/.test(phone)) {
    return { code: 400, message: '手机号格式不正确' };
  }

  try {
    // 1. 获取 uni-id 配置
    const uniIdConfig = require('uni-config-center')({ pluginId: 'uni-id' }).config();
    const uniIdIns = uniIdCommon.createInstance({
      context: context,
      config: uniIdConfig
    });

    // 2. 验证短信验证码
    const verifyRes = await uniIdIns.verifyCode({
      mobile: phone,
      code: code,
      type: 'register'
    });

    if (verifyRes.errCode) {
      return { code: 400, message: verifyRes.errMsg || '验证码错误或已过期' };
    }

    // 3. 检查手机号是否已被注册
    const existUser = await db.collection('uni-id-users')
      .where({ mobile: phone })
      .get();

    if (existUser.data.length > 0) {
      return { code: 400, message: '该手机号已被注册' };
    }

    // 4. 创建用户（普通用户，无管理员权限）
    const userData = {
      mobile: phone,
      mobile_confirmed: 1,
      wx_openid: {
        'mp-weixin': openid
      },
      nickname: `用户${phone.substr(-4)}`,
      role: ['user'], // 普通用户角色
      score: 0, // 初始积分为0
      register_date: Date.now(),
      register_ip: context.CLIENTIP,
      last_login_date: Date.now(),
      last_login_ip: context.CLIENTIP,
      status: 0 // 0-正常
    };

    const addRes = await db.collection('uni-id-users').add(userData);
    const uid = addRes.id;

    // 5. 生成token
    const tokenRes = await uniIdIns.createToken({
      uid: uid,
      role: ['user']
    });

    if (tokenRes.errCode) {
      return {
        code: 500,
        message: tokenRes.errMsg || '生成token失败'
      };
    }

    return {
      code: 0,
      message: '注册成功',
      token: tokenRes.token,
      tokenExpired: tokenRes.tokenExpired,
      userInfo: {
        _id: uid,
        nickname: userData.nickname,
        mobile: phone,
        role: ['user']
      }
    };
  } catch (e) {
    console.error('注册失败:', e);
    return {
      code: 500,
      message: e.message || '注册失败'
    };
  }
};