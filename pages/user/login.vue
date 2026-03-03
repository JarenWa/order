<template>
  <view class="login-container">
    <view class="login-box">
      <view class="logo">
        <image src="/static/logo.png" mode="aspectFit"></image>
      </view>
      <view class="title">欢迎登录</view>

      <!-- 微信登录按钮 -->
      <button
        class="weixin-btn"
        type="primary"
        open-type="getUserInfo"
        @getuserinfo="weixinLogin"
        :loading="weixinLoading"
      >
        微信登录
      </button>

      <!-- 分隔线 -->
      <view class="divider">
        <text class="divider-text">或</text>
      </view>

      <!-- 密码登录表单（管理员使用） -->
      <view class="form" v-if="showPwdLogin">
        <uni-forms ref="form" :modelValue="formData" :rules="rules">
          <uni-forms-item name="username" label="账号" required>
            <uni-easyinput
              type="text"
              v-model="formData.username"
              placeholder="请输入用户名/手机号/邮箱"
            />
          </uni-forms-item>
          <uni-forms-item name="password" label="密码" required>
            <uni-easyinput
              type="password"
              v-model="formData.password"
              placeholder="请输入密码"
            />
          </uni-forms-item>
        </uni-forms>
        <button type="primary" class="login-btn" @click="handlePwdLogin" :loading="pwdLoading">
          登录
        </button>
        <view class="register-link" @click="goRegister">还没有账号？立即注册</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      weixinLoading: false,
      pwdLoading: false,
      showPwdLogin: true,
      formData: {
        username: '',
        password: ''
      },
      rules: {
        username: { rules: [{ required: true, errorMessage: '请输入账号' }] },
        password: {
          rules: [
            { required: true, errorMessage: '请输入密码' },
            { minLength: 6, maxLength: 20, errorMessage: '密码长度在6-20位之间' }
          ]
        }
      }
    }
  },
  onLoad() {
    if (uni.getStorageSync('uni_id_token')) {
      uni.switchTab({ url: '/pages/index/index' });
    }
  },
  methods: {
    // 微信登录
    async weixinLogin(e) {
      if (!e.detail.userInfo) {
        uni.showToast({ title: '您拒绝了授权', icon: 'none' });
        return;
      }
      this.weixinLoading = true;
      try {
        // 1. 获取 code
        const loginRes = await new Promise((resolve, reject) => {
          uni.login({
            provider: 'weixin',
            success: resolve,
            fail: reject
          });
        });
        const code = loginRes.code;

        // 2. 调用 uni-id-co 的微信登录接口
        const uniIdCo = uniCloud.importObject('uni-id-co');
        const res = await uniIdCo.loginByWeixin({ code });

        if (res.code === 0) {
          // 保存 token 和用户信息
          uni.setStorageSync('uni_id_token', res.token);
          uni.setStorageSync('userInfo', res.userInfo);
          uni.setStorageSync('role', res.userInfo.role || []);

          // 判断手机号是否已验证（mobile_confirmed === 1）
          const hasVerifiedMobile = res.userInfo.mobile_confirmed === 1;
          if (hasVerifiedMobile) {
            // 已绑定并验证手机号，跳转首页
            uni.switchTab({ url: '/pages/index/index' });
          } else {
            // 未绑定手机号或未验证，跳转到绑定手机号页面
            uni.navigateTo({ url: '/pages/user/bind-mobile' });
          }
        } else {
          uni.showModal({ content: res.message || '微信登录失败', showCancel: false });
        }
      } catch (err) {
        console.error('微信登录失败', err);
        uni.showModal({ content: err.message || '微信登录失败', showCancel: false });
      } finally {
        this.weixinLoading = false;
      }
    },

    // 密码登录（管理员）
    async handlePwdLogin() {
      await this.$refs.form.validate();
      this.pwdLoading = true;
      try {
        const uniIdCo = uniCloud.importObject('uni-id-co');
        const res = await uniIdCo.login({
          username: this.formData.username,
          password: this.formData.password
        });
        if (res.code === 0) {
          uni.setStorageSync('uni_id_token', res.token);
          uni.setStorageSync('userInfo', res.userInfo);
          uni.setStorageSync('role', res.userInfo.role || []);
          uni.switchTab({ url: '/pages/index/index' });
        } else {
          uni.showModal({ content: res.message || '登录失败', showCancel: false });
        }
      } catch (err) {
        console.error('密码登录失败', err);
        uni.showModal({ content: err.message || '登录失败', showCancel: false });
      } finally {
        this.pwdLoading = false;
      }
    },

    goRegister() {
      uni.navigateTo({ url: '/pages/user/register' });
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}
.login-box {
  width: 100%;
  max-width: 400px;
  background-color: #fff;
  border-radius: 12px;
  padding: 30px 20px;
}
.logo {
  text-align: center;
  margin-bottom: 20px;
}
.logo image {
  width: 80px;
  height: 80px;
}
.title {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 30px;
}
.weixin-btn {
  width: 100%;
  background-color: #07c160;
  border-radius: 8px;
  margin-bottom: 20px;
}
.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
  color: #999;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: #ddd;
}
.divider-text {
  padding: 0 10px;
  font-size: 14px;
}
.form {
  padding: 0 10px;
}
.login-btn {
  width: 100%;
  margin-top: 30px;
  background-color: #007aff;
  border-radius: 8px;
}
.register-link {
  text-align: center;
  margin-top: 20px;
  color: #007aff;
  font-size: 14px;
}
</style>