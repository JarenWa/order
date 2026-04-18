'use strict';
const db = uniCloud.database();
const uniIdCommon = require('uni-id-common');

exports.main = async (event, context) => {
  const { code, phoneCode } = event;

  if (!code || !phoneCode) {
    return { code: 400, message: '缺少必要参数' };
  }

  try {
    // 1. 获取 uni-id 配置
    const uniIdConfig = require('uni-config-center')({ pluginId: 'uni-id' }).config();
    const wxConfig = uniIdConfig['mp-weixin'].oauth.weixin;

    // 2. 通过 code 换取 openid
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

    // 3. 获取 access_token（修改变量名）
    const accessTokenRes = await uniCloud.httpclient.request(
      `https://api.weixin.qq.com/cgi-bin/token`,
      {
        method: 'GET',
        data: {
          grant_type: 'client_credential',
          appid: wxConfig.appid,
          secret: wxConfig.appsecret
        },
        dataType: 'json'
      }
    );
    
    if (accessTokenRes.status !== 200 || !accessTokenRes.data.access_token) {
      return { code: 500, message: '获取access_token失败' };
    }
    const accessToken = accessTokenRes.data.access_token;
    
    // 4. 获取手机号（使用 accessToken）
    const getPhoneRes = await uniCloud.httpclient.request(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
      {
        method: 'POST',
        data: JSON.stringify({ code: phoneCode }),
        headers: {
          'content-type': 'application/json'
        },
        dataType: 'json'
      }
    );

    if (getPhoneRes.status !== 200 || getPhoneRes.data.errcode !== 0) {
      return {
        code: 500,
        message: '获取手机号失败: ' + (getPhoneRes.data.errmsg || '未知错误')
      };
    }

    const phoneNumber = getPhoneRes.data.phone_info.phoneNumber;

    // 5. 查询用户是否已存在（通过 openid）
    const userRes = await db.collection('uni-id-users')
      .where({
        'wx_openid.mp-weixin': openid
      })
      .get();

    const uniIdIns = uniIdCommon.createInstance({
      context: context,
      config: uniIdConfig
    });

    let uid;
    let userInfo;

    if (userRes.data && userRes.data.length > 0) {
      // 用户已存在，更新手机号（如果没有）
      const user = userRes.data[0];
      uid = user._id;

      if (!user.mobile) {
        await db.collection('uni-id-users').doc(uid).update({
          mobile: phoneNumber,
          mobile_confirmed: 1,
          last_login_date: Date.now(),
          last_login_ip: context.CLIENTIP
        });
      } else {
        await db.collection('uni-id-users').doc(uid).update({
          last_login_date: Date.now(),
          last_login_ip: context.CLIENTIP
        });
      }

      userInfo = {
        _id: uid,
        nickname: user.nickname,
        avatar_file: user.avatar_file,
        mobile: user.mobile || phoneNumber,
        role: user.role || ['user']
      };
    } else {
      // 用户不存在，创建新用户
      const userData = {
        mobile: phoneNumber,
        mobile_confirmed: 1,
        wx_openid: {
          'mp-weixin': openid
        },
        nickname: `用户${phoneNumber.substr(-4)}`,
        role: ['user'], // 普通用户角色
        score: 0, // 初始积分为0
        register_date: Date.now(),
        register_ip: context.CLIENTIP,
        last_login_date: Date.now(),
        last_login_ip: context.CLIENTIP,
        status: 0 // 0-正常
      };

      const addRes = await db.collection('uni-id-users').add(userData);
      uid = addRes.id;

      userInfo = {
        _id: uid,
        nickname: userData.nickname,
        mobile: phoneNumber,
        role: ['user']
      };
    }

   // 6. 生成用户 token（修改变量名）
   const createTokenRes = await uniIdIns.createToken({
     uid: uid,
     role: userInfo.role
   });
   
   if (createTokenRes.errCode) {
     return { code: 500, message: createTokenRes.errMsg || '生成token失败' };
   }
   
   return {
     code: 0,
     message: '登录成功',
     token: createTokenRes.token,
     tokenExpired: createTokenRes.tokenExpired,
     userInfo: userInfo
   };
  } catch (e) {
    console.error('微信登录失败:', e);
    return {
      code: 500,
      message: e.message || '登录失败'
    };
  }
};
