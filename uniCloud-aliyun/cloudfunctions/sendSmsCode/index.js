'use strict';
const uniIdCommon = require('uni-id-common');

exports.main = async (event, context) => {
  const { phone, type } = event;

  if (!phone || !/^1\d{10}$/.test(phone)) {
    return { code: 400, message: '手机号格式不正确' };
  }

  try {
    // 获取 uni-id 配置
    const uniIdConfig = require('uni-config-center')({ pluginId: 'uni-id' }).config();
    const uniIdIns = uniIdCommon.createInstance({
      context: context,
      config: uniIdConfig
    });

    // 发送短信验证码
    const result = await uniIdIns.sendSmsCode({
      mobile: phone,
      type: type || 'register'
    });

    if (result.errCode) {
      return {
        code: 500,
        message: result.errMsg || '发送失败'
      };
    }

    return {
      code: 0,
      message: '验证码已发送'
    };
  } catch (e) {
    console.error('发送验证码失败:', e);
    return {
      code: 500,
      message: e.message || '发送失败'
    };
  }
};