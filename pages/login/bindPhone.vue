<template>
  <view class="bind-phone-container">
    <view class="bind-box">
      <view class="title">绑定手机号</view>
      <view class="desc">首次登录需要绑定手机号</view>

      <!-- #ifdef MP-WEIXIN -->
      <button class="bind-btn" type="primary" open-type="getPhoneNumber" @getphonenumber="handleGetPhoneNumber" :loading="loading">
        授权手机号
      </button>
      <!-- #endif -->

      <button class="cancel-btn" @click="goBack">取消</button>
    </view>
  </view>
</template>

<script>
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js';

export default {
  data() {
    return {
      openid: '',
      loading: false
    };
  },
  onLoad(options) {
    this.openid = options.openid;
    if (!this.openid) {
      uni.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    }
  },
  
    methods: {
      async handleGetPhoneNumber(e) {
        if (e.detail.errMsg !== 'getPhoneNumber:ok') {
          return uni.showToast({ title: '需要授权手机号才能完成注册', icon: 'none' });
        }
  
        this.loading = true;
  
        try {
          const loginRes = await new Promise((resolve, reject) => {
            uni.login({ provider: 'weixin', success: resolve, fail: reject });
          });
          const code = loginRes.code;
          const phoneCode = e.detail.code;
  
          const result = await uniCloud.callFunction({
            name: 'weixinLoginWithPhone',
            data: { code, phoneCode }
          });
  
          // if (result.result.code === 0) {
          //   // ✅ 不再手动保存 token，直接调用标准登录成功处理
          //   mutations.loginSuccess({
          //     showToast: true,
          //     toastText: '注册成功',
          //     autoBack: true,
          //     uniIdRedirectUrl: '/pages/index/index',
          //     token: result.result.token,           // 传入 token
          //     tokenExpired: result.result.tokenExpired
          //   });
          // } 
		  
		  if (result.result.code === 0) {
		    uni.setStorageSync('uni_id_token', result.result.token);
		    uni.setStorageSync('uni_id_token_expired', result.result.tokenExpired);
		    
		    mutations.loginSuccess({
		      showToast: true,
		      toastText: '注册成功',
		      autoBack: true,
		      uniIdRedirectUrl: '/pages/index/index'
		    });
		  }else {
            uni.showToast({ title: result.result.message || '注册失败', icon: 'none' });
          }
        } catch (e) {
          console.error('绑定手机号失败:', e);
          uni.showToast({ title: '绑定失败', icon: 'none' });
        } finally {
          this.loading = false;
        }
      },
    
    goBack() {
      uni.navigateBack();
    }
  }
};
</script>

<style scoped>
.bind-phone-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.bind-box {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20rpx;
  color: #333;
}

.desc {
  font-size: 28rpx;
  text-align: center;
  color: #666;
  margin-bottom: 60rpx;
}

.bind-btn {
  width: 100%;
  height: 88rpx;
  background: #07c160;
  border-radius: 44rpx;
  font-size: 32rpx;
  margin-bottom: 20rpx;
}

.cancel-btn {
  width: 100%;
  height: 88rpx;
  background: #f5f5f5;
  color: #666;
  border-radius: 44rpx;
  font-size: 32rpx;
}
</style>
