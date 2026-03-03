<template>
  <view class="register-container">
    <view class="register-box">
      <view class="title">手机号注册</view>
      <uni-forms ref="form" :modelValue="formData" :rules="rules">
        <uni-forms-item name="mobile" label="手机号" required>
          <uni-easyinput
            type="number"
            v-model="formData.mobile"
            placeholder="请输入手机号"
          />
        </uni-forms-item>
        <uni-forms-item name="password" label="密码" required>
          <uni-easyinput
            type="password"
            v-model="formData.password"
            placeholder="请输入密码"
          />
        </uni-forms-item>
        <uni-forms-item name="password2" label="确认密码" required>
          <uni-easyinput
            type="password"
            v-model="formData.password2"
            placeholder="请再次输入密码"
          />
        </uni-forms-item>
      </uni-forms>
      <button type="primary" class="register-btn" @click="handleRegister" :loading="loading">
        注册
      </button>
      <view class="login-link" @click="goLogin">已有账号？立即登录</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      formData: {
        mobile: '',
        password: '',
        password2: ''
      },
      rules: {
        mobile: {
          rules: [
            { required: true, errorMessage: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, errorMessage: '手机号格式不正确' }
          ]
        },
        password: {
          rules: [
            { required: true, errorMessage: '请输入密码' },
            { minLength: 6, maxLength: 20, errorMessage: '密码长度在6-20位之间' }
          ]
        },
        password2: {
          rules: [
            { required: true, errorMessage: '请确认密码' },
            { validateFunction: (rule, value, data) => value === data.password ? '' : '两次密码不一致' }
          ]
        }
      }
    }
  },
  methods: {
    async handleRegister() {
      await this.$refs.form.validate();
      this.loading = true;
      try {
        const uniIdCo = uniCloud.importObject('uni-id-co');
        const res = await uniIdCo.register({
          mobile: this.formData.mobile,
          password: this.formData.password
        });
        if (res.code === 0) {
          uni.showToast({ title: '注册成功', icon: 'success' });
          setTimeout(() => {
            uni.navigateTo({ url: '/pages/user/login' });
          }, 1500);
        } else {
          uni.showModal({ content: res.message || '注册失败', showCancel: false });
        }
      } catch (err) {
        console.error('注册失败', err);
        uni.showModal({ content: err.message || '注册失败', showCancel: false });
      } finally {
        this.loading = false;
      }
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/user/login' });
    }
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}
.register-box {
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
  margin-bottom: 30px;
}
.register-btn {
  width: 100%;
  margin-top: 30px;
  background-color: #007aff;
  border-radius: 8px;
}
.login-link {
  text-align: center;
  margin-top: 20px;
  color: #007aff;
  font-size: 14px;
}
</style>