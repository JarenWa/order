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

      <!-- 密码登录表单 -->
      <view class="form">
        <uni-forms ref="form" :modelValue="formData" :rules="rules">
          <uni-forms-item name="username" required>
            <uni-easyinput
              v-model="formData.username"
              placeholder="用户名"
            />
          </uni-forms-item>
          <uni-forms-item name="password" required>
            <uni-easyinput
              v-model="formData.password"
              placeholder="密码"
              type="password"
            />
          </uni-forms-item>
        </uni-forms>
        <button type="primary" class="login-btn" @click="handlePwdLogin" :loading="pwdLoading">
          登录
        </button>
        <view class="register-link" @click="goRegister">没有账号？立即注册</view>
      </view>
    </view>
  </view>
</template>

<script>
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js'

const db = uniCloud.database()

export default {
  data() {
    return {
      weixinLoading: false,
      pwdLoading: false,
      formData: {
        username: '',
        password: ''
      },
      rules: {
        username: { rules: [{ required: true, errorMessage: '请输入账号' }] },
        password: { rules: [{ required: true, errorMessage: '请输入密码' }] }
      }
    }
  },
  onLoad() {
    // 如果已登录，直接跳转首页
    if (uni.getStorageSync('uni_id_token')) {
      uni.switchTab({ url: '/pages/index/index' })
    }
  },
  methods: {
    // 微信登录
    async weixinLogin(e) {
      if (!e.detail.userInfo) {
        uni.showToast({ title: '您拒绝了授权', icon: 'none' })
        return
      }
      this.weixinLoading = true
      try {
        // 1. 获取 code
        const loginRes = await new Promise((resolve, reject) => {
          uni.login({
            provider: 'weixin',
            success: resolve,
            fail: reject
          })
        })
        const code = loginRes.code

        // 2. 调用 uni-id-co 的微信登录接口
        const uniIdCo = uniCloud.importObject('uni-id-co')
        const res = await uniIdCo.loginByWeixin({ code })

        if (res.code === 0) {
          // 保存 token 和用户信息
          uni.setStorageSync('uni_id_token', res.token)
          uni.setStorageSync('userInfo', res.userInfo)
          // 同步 store
          mutations.setUserInfo(res.userInfo)

          // 判断手机号是否为空
          if (!res.userInfo || !res.userInfo.mobile) {
            // 未绑定，跳转到绑定手机号页面
            uni.navigateTo({
              url: '/uni_modules/uni-id-pages/pages/userinfo/bind-mobile/bind-mobile'
            })
          } else {
            // 已绑定，跳转到首页
            uni.switchTab({ url: '/pages/index/index' })
          }
        } else {
          uni.showModal({ content: res.message || '微信登录失败', showCancel: false })
        }
      } catch (err) {
        console.error('微信登录失败', err)
        uni.showModal({ content: err.message || '微信登录失败', showCancel: false })
      } finally {
        this.weixinLoading = false
      }
    },

    // 密码登录
    async handlePwdLogin() {
      await this.$refs.form.validate()
      this.pwdLoading = true
      try {
        const uniIdCo = uniCloud.importObject('uni-id-co')
        const res = await uniIdCo.login({
          username: this.formData.username,
          password: this.formData.password
        })
        if (res.code === 0) {
          uni.setStorageSync('uni_id_token', res.token)
          uni.setStorageSync('userInfo', res.userInfo)
          mutations.setUserInfo(res.userInfo)
          // 密码登录的用户通常已有手机号，直接跳转首页
          uni.switchTab({ url: '/pages/index/index' })
        } else {
          uni.showModal({ content: res.message || '登录失败', showCancel: false })
        }
      } catch (err) {
        console.error('密码登录失败', err)
        uni.showModal({ content: err.message || '登录失败', showCancel: false })
      } finally {
        this.pwdLoading = false
      }
    },

    // 跳转到注册页面（如需）
    goRegister() {
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/register/register' })
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