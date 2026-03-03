<template>
  <view class="bind-container">
    <view class="bind-box">
      <view class="title">绑定手机号</view>
      <view class="desc">为了账号安全，请绑定您的手机号</view>

      <uni-forms ref="form" :modelValue="formData" :rules="rules">
        <!-- 手机号输入 -->
        <uni-forms-item name="mobile" label="手机号" required>
          <uni-easyinput
            type="number"
            v-model="formData.mobile"
            placeholder="请输入手机号"
            :maxlength="11"
          />
        </uni-forms-item>

        <!-- 验证码输入 + 获取验证码按钮 -->
        <uni-forms-item name="code" label="验证码" required>
          <view class="code-row">
            <uni-easyinput
              type="number"
              v-model="formData.code"
              placeholder="请输入验证码"
              :maxlength="6"
              class="code-input"
            />
            <button
              class="code-btn"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}秒后重试` : '获取验证码' }}
            </button>
          </view>
        </uni-forms-item>
      </uni-forms>

      <button type="primary" class="bind-btn" @click="handleBind" :loading="loading">
        绑定
      </button>

      <view class="skip-link" @click="skipBind">暂不绑定，逛逛</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      countdown: 0,
      timer: null,
      formData: {
        mobile: '',
        code: ''
      },
      rules: {
        mobile: {
          rules: [
            { required: true, errorMessage: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, errorMessage: '手机号格式不正确' }
          ]
        },
        code: {
          rules: [
            { required: true, errorMessage: '请输入验证码' },
            { pattern: /^\d{4,6}$/, errorMessage: '验证码格式不正确' }
          ]
        }
      }
    };
  },
  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },
  methods: {
    // 发送验证码
    async sendCode() {
      try {
        await this.$refs.form.validateField('mobile');
      } catch (err) {
        uni.showToast({ title: err.errorMessage || '手机号格式错误', icon: 'none' });
        return;
      }

      if (this.countdown > 0) return;

      uni.showLoading({ title: '发送中...' });
      try {
        const uniIdCo = uniCloud.importObject('uni-id-co');
        const res = await uniIdCo.sendSmsCode({
          mobile: this.formData.mobile,
          scene: 'bind-mobile'  // 场景：绑定手机号，请根据 uni-id-co 配置调整
        });

        if (res.code === 0) {
          uni.showToast({ title: '验证码已发送', icon: 'success' });
          this.countdown = 60;
          this.timer = setInterval(() => {
            if (this.countdown <= 1) {
              clearInterval(this.timer);
              this.timer = null;
              this.countdown = 0;
            } else {
              this.countdown -= 1;
            }
          }, 1000);
        } else {
          uni.showModal({ content: res.message || '发送失败', showCancel: false });
        }
      } catch (err) {
        console.error('发送验证码失败', err);
        uni.showModal({ content: err.message || '发送失败', showCancel: false });
      } finally {
        uni.hideLoading();
      }
    },

    // 绑定手机号
    async handleBind() {
      await this.$refs.form.validate();

      this.loading = true;
      try {
        const uniIdCo = uniCloud.importObject('uni-id-co');
        const res = await uniIdCo.bindMobileBySms({
          mobile: this.formData.mobile,
          code: this.formData.code
        });

        if (res.code === 0) {
          uni.showToast({ title: '绑定成功', icon: 'success' });

          // 更新本地存储的用户信息
          const userInfo = uni.getStorageSync('userInfo') || {};
          if (res.userInfo) {
            // 如果云对象返回了最新的用户信息，直接使用
            uni.setStorageSync('userInfo', res.userInfo);
          } else {
            // 否则手动更新手机号相关字段
            userInfo.mobile = this.formData.mobile;
            userInfo.mobile_confirmed = 1;
            uni.setStorageSync('userInfo', userInfo);
          }

          setTimeout(() => {
            uni.switchTab({ url: '/pages/index/index' });
          }, 1500);
        } else {
          uni.showModal({ content: res.message || '绑定失败', showCancel: false });
        }
      } catch (err) {
        console.error('绑定手机号失败', err);
        uni.showModal({ content: err.message || '绑定失败', showCancel: false });
      } finally {
        this.loading = false;
      }
    },

    // 跳过绑定（根据业务决定是否允许）
    skipBind() {
      uni.switchTab({ url: '/pages/index/index' });
    }
  }
};
</script>

<style scoped>
.bind-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}
.bind-box {
  width: 100%;
  max-width: 400px;
  background-color: #fff;
  border-radius: 12px;
  padding: 30px 20px;
}
.title {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}
.desc {
  text-align: center;
  font-size: 14px;
  color: #999;
  margin-bottom: 30px;
}
.code-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.code-input {
  flex: 1;
}
.code-btn {
  width: 120px;
  flex-shrink: 0;
  background-color: #007aff;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
}
.code-btn[disabled] {
  background-color: #ccc;
  color: #fff;
}
.bind-btn {
  width: 100%;
  margin-top: 30px;
  background-color: #07c160;
  border-radius: 8px;
}
.skip-link {
  text-align: center;
  margin-top: 20px;
  color: #007aff;
  font-size: 14px;
}
</style>