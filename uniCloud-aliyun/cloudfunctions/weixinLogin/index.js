'use strict';
const db = uniCloud.database();
const uniIdCommon = require('uni-id-common');

exports.main = async (event, context) => {
  const { code } = event;

  if (!code) {
    return { code: 400, message: '缺少code参数' };
  }

  try {
    // 1. 通过 code 换取 openid 和 session_key
    const uniIdConfig = require('uni-config-center')({ pluginId: 'uni-id' }).config();
    const wxConfig = uniIdConfig['mp-weixin'].oauth.weixin;

    const code2SessionRes = await uniCloud.httpclient.request(
      `https://api.weixin.qq.com/sns/jscode2session`,
      {
        method: 'GET',
        data: {
          appid: wxConfig.appid,
          secret: wxConfig.appsecret,
          js_code: code,
          grant_type: 'authorization_code'
        },
        dataType: 'json'
      }
    );

    if (code2SessionRes.status !== 200 || !code2SessionRes.data.openid) {
      return {
        code: 500,
        message: '获取微信信息失败: ' + (code2SessionRes.data.errmsg || '未知错误')
      };
    }

    const { openid, session_key } = code2SessionRes.data;

    // 2. 查询用户是否已存在
    const userRes = await db.collection('uni-id-users')
      .where({
        'wx_openid.mp-weixin': openid
      })
      .get();

    // 3. 如果用户不存在，返回需要注册
    if (!userRes.data || userRes.data.length === 0) {
      return {
        code: 1001,
        message: '需要绑定手机号',
        openid: openid
      };
    }

    // 4. 用户已存在，生成 token 并返回
    const user = userRes.data[0];
    const uniIdIns = uniIdCommon.createInstance({
      context: context,
      config: uniIdConfig
    });

    const tokenRes = await uniIdIns.createToken({
      uid: user._id,
      role: user.role || []
    });

    if (tokenRes.errCode) {
      return {
        code: 500,
        message: tokenRes.errMsg || '生成token失败'
      };
    }

    return {
      code: 0,
      message: '登录成功',
      token: tokenRes.token,
      tokenExpired: tokenRes.tokenExpired,
      userInfo: {
        _id: user._id,
        nickname: user.nickname,
        avatar_file: user.avatar_file,
        mobile: user.mobile,
        role: user.role
      }
    };
  } catch (e) {
    console.error('微信登录失败:', e);
    return {
      code: 500,
      message: e.message || '登录失败'
    };
  }
};