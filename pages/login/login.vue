<template>
  <view class="login-container">
    <view class="login-box">
      <view class="logo">
      <!--  <image src="/static/logo.png" mode="aspectFit"></image> -->
      </view>
      <view class="title">欢迎使用微信一键登录</view>

      <!-- 微信登录按钮 -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="weixin-btn" type="primary" @click="weixinLogin" :loading="weixinLoading">
        <uni-icons type="weixin" size="20" color="#fff"></uni-icons>
        微信一键登录
      </button>
      <!-- #endif -->


      <!-- 分隔线 -->
      <view class="divider">
        <view class="divider-line"></view>
        <text class="divider-text">管理员登录</text>
        <view class="divider-line"></view>
      </view>

      <!-- 管理员账密登录表单 -->
      <view class="form">
        <uni-forms ref="form" :modelValue="formData" :rules="rules">
          <uni-forms-item name="username" required>
            <uni-easyinput
              v-model="formData.username"
              placeholder="请输入账号"
              :inputBorder="false"
              class="input-box"
              trim="both"
            />
          </uni-forms-item>
          <uni-forms-item name="password" required>
            <uni-easyinput
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              :inputBorder="false"
              class="input-box"
              trim="both"
            />
          </uni-forms-item>
        </uni-forms>
        <button class="admin-btn" @click="adminLogin" :loading="adminLoading">登录</button>
      </view>

      <!-- 用户协议 -->
      <view class="agreement">
        <checkbox :checked="agreed" @click="agreed = !agreed" />
        <text class="agreement-text">我已阅读并同意</text>
        <text class="link" @click="toService">《用户服务协议》</text>
        <text class="agreement-text">和</text>
        <text class="link" @click="toPrivacy">《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<script>
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      formData: {
        username: '',
        password: ''
      },
      rules: {
        username: {
          rules: [{ required: true, errorMessage: '请输入管理员账号' }]
        },
        password: {
          rules: [{ required: true, errorMessage: '请输入密码' }]
        }
      },
      weixinLoading: false,
      adminLoading: false,
      agreed: false
    };
  },
  methods: {
    /**
     * 统一的登录成功处理
     * @param {string} token - 用户token
     * @param {number} tokenExpired - token过期时间戳
     * @param {string} redirectUrl - 跳转路径，默认为首页
     */
    async handleLoginSuccess(token, tokenExpired, redirectUrl = '/pages/index/index') {
      // 1. 保存 token 到本地存储
      uni.setStorageSync('uni_id_token', token);
      uni.setStorageSync('uni_id_token_expired', tokenExpired);
      // 兼容旧 key
      uni.setStorageSync('uni-id-token', token);

      // 2. 获取当前用户信息并更新 store
      try {
        const uniIdCo = uniCloud.importObject('uni-id-co');
        const userInfoRes = await uniIdCo.getCurrentUserInfo();
        if (userInfoRes.code === 0) {
          // 更新 store 中的用户信息
          mutations.updateUserInfo(userInfoRes.userInfo);
        } else {
          console.error('获取用户信息失败', userInfoRes);
        }
      } catch (e) {
        console.error('获取用户信息异常', e);
      }

      // 3. 跳转页面
      uni.switchTab({ url: redirectUrl });
    },
// 微信登录
weixinLogin() {
  if (!this.agreed) {
    return uni.showToast({ title: '请先同意用户协议', icon: 'none' });
  }

  this.weixinLoading = true;
  // #ifdef MP-WEIXIN
  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      const code = loginRes.code;
      try {
        const result = await uniCloud.callFunction({
          name: 'weixinLogin',
          data: { code }
        });

        // if (result.result.code === 0) {
        //   // 老用户：直接调用标准登录成功处理
        //   // mutations.loginSuccess 会自动保存 token、获取用户信息、更新 store、跳转
        //   mutations.loginSuccess({
        //     showToast: true,
        //     toastText: '登录成功',
        //     autoBack: true,
        //     uniIdRedirectUrl: '/pages/index/index',
        //     token: result.result.token,           // 传入 token，避免额外请求
        //     tokenExpired: result.result.tokenExpired
        //   });
        // } 
		if (result.result.code === 0) {
		  // 只保存 token，其余交给 loginSuccess
		  uni.setStorageSync('uni_id_token', result.result.token);
		  uni.setStorageSync('uni_id_token_expired', result.result.tokenExpired);
		  
		  mutations.loginSuccess({
		    showToast: true,
		    toastText: '登录成功',
		    autoBack: true,
		    uniIdRedirectUrl: '/pages/index/index'
		    // 注意：不传 token 和 tokenExpired
		  });
		}
		else if (result.result.code === 1001) {
          // 新用户：需要绑定手机号，传递必要的参数
          uni.navigateTo({
            url: `/pages/login/bindPhone?openid=${result.result.openid}`
          });
        } else {
          uni.showToast({ title: result.result.message || '登录失败', icon: 'none' });
        }
      } catch (e) {
        console.error('微信登录失败:', e);
        uni.showToast({ title: '登录失败', icon: 'none' });
      } finally {
        this.weixinLoading = false;
      }
    },
    fail: (err) => {
      console.error('微信授权失败:', err);
      uni.showToast({ title: '微信授权失败', icon: 'none' });
      this.weixinLoading = false;
    }
  });
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中使用', icon: 'none' });
  this.weixinLoading = false;
  // #endif
},
    // 微信登录
    // weixinLogin() {
    //   if (!this.agreed) {
    //     return uni.showToast({ title: '请先同意用户协议', icon: 'none' });
    //   }

    //   this.weixinLoading = true;
    //   // #ifdef MP-WEIXIN
    //   uni.login({
    //     provider: 'weixin',
    //     success: async (loginRes) => {
    //       const code = loginRes.code;
    //       try {
    //         const result = await uniCloud.callFunction({
    //           name: 'weixinLogin',
    //           data: { code }
    //         });

    //         if (result.result.code === 0) {
    //           // 老用户：直接登录成功
    //           await this.handleLoginSuccess(
    //             result.result.token,
    //             result.result.tokenExpired,
    //             '/pages/index/index'
    //           );
    //           uni.showToast({ title: '登录成功', icon: 'success' });
    //         } else if (result.result.code === 1001) {
    //           // 新用户：需要绑定手机号
    //           uni.navigateTo({
    //             url: `/pages/login/bindPhone?openid=${result.result.openid}`
    //           });
    //         } else {
    //           uni.showToast({ title: result.result.message || '登录失败', icon: 'none' });
    //         }
    //       } catch (e) {
    //         console.error('微信登录失败:', e);
    //         uni.showToast({ title: '登录失败', icon: 'none' });
    //       } finally {
    //         this.weixinLoading = false;
    //       }
    //     },
    //     fail: (err) => {
    //       console.error('微信授权失败:', err);
    //       uni.showToast({ title: '微信授权失败', icon: 'none' });
    //       this.weixinLoading = false;
    //     }
    //   });
    //   // #endif

    //   // #ifndef MP-WEIXIN
    //   uni.showToast({ title: '请在微信小程序中使用', icon: 'none' });
    //   this.weixinLoading = false;
    //   // #endif
    // },

    // 管理员账密登录
    async adminLogin() {
      if (!this.agreed) {
        return uni.showToast({ title: '请先同意用户协议', icon: 'none' });
      }
      try {
        await this.$refs.form.validate();
      } catch (e) {
        return;
      }
    
      this.adminLoading = true;
      try {
        const uniIdCo = uniCloud.importObject('uni-id-co');
        const result = await uniIdCo.login({
          username: this.formData.username,
          password: this.formData.password
        });
    
        // 1. 先不手动保存 token，也不手动查库
        // 2. 登录成功后，立即使用标准方法完成登录并跳转
        // 3. 将角色检查放在跳转后的首页，或通过云函数验证
    
        // 调用标准登录成功处理（它会自动保存 token、获取用户信息、更新 store、跳转）
        // 注意：不要提前保存 token，全部交给 loginSuccess
        mutations.loginSuccess({
          showToast: true,
          toastText: '登录成功',
          autoBack: true,
          uniIdRedirectUrl: '/pages/index/index'  // 登录后跳转到首页
        });
    
        // 可选：在跳转前，可以先将 result 中的角色信息临时存储，供首页检查
        // 但更推荐在首页的 onShow 中从 store 获取用户角色，如果不是 admin 则踢出
      } catch (e) {
        console.error('管理员登录失败:', e);
        uni.showToast({ title: e.message || '登录失败', icon: 'none' });
      } finally {
        this.adminLoading = false;
      }
    },
    toService() {
      uni.navigateTo({ url: '/pages/login/service' });
    },

    toPrivacy() {
      uni.navigateTo({ url: '/pages/login/privacy' });
    }
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.login-box {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.1);
}

.logo {
  width: 160rpx;
  height: 160rpx;
  margin: 0 auto 40rpx;
}

.logo image {
  width: 100%;
  height: 100%;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 60rpx;
  color: #333;
}

.weixin-btn {
  width: 100%;
  height: 88rpx;
  background: #07c160;
  border-radius: 44rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}

.divider {
  display: flex;
  align-items: center;
  margin: 40rpx 0;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: #e5e5e5;
}

.divider-text {
  padding: 0 20rpx;
  font-size: 24rpx;
  color: #999;
}

.form {
  margin-top: 40rpx;
}

.input-box {
  background: #f5f5f5;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
}

.admin-btn {
  width: 100%;
  height: 88rpx;
  background: #667eea;
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  margin-top: 40rpx;
}

.agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
  font-size: 24rpx;
}

.agreement-text {
  color: #666;
  margin: 0 4rpx;
}

.link {
  color: #667eea;
}
</style>