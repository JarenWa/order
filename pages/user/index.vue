<template>
  <view class="app-container-no-padding">
    <!-- 头部用户信息区域 -->
    <view class="app-card user-header" @click="goUserInfo">
      <image class="avatar" :src="avatarUrl" mode="aspectFill"></image>
      <view class="user-info">
        <text class="nickname">{{ userInfo.nickname || '未设置昵称' }}</text>
        <text class="phone">{{ userInfo.mobile || '未绑定手机号[!请点击绑定]' }}</text>
      </view>
      <uni-icons type="arrowright" size="20" color="#999"></uni-icons>
    </view>

    <!-- 积分统计卡片 -->
    <view class="app-card score-section">
      <view class="score-item">
        <text class="score-label">已获积分</text>
        <text class="score-value app-text-price">{{ formatPrice(userScore) }}</text>
      </view>
      <view class="score-item">
        <text class="score-label">待获积分</text>
        <text class="score-value app-text-price">{{ formatPrice(pendingScore) }}</text>
      </view>
    </view>

    <!-- 订单状态卡片区域 -->
    <view class="app-card order-status-section">
      <view v-for="(card, idx) in orderStatusCards" :key="idx"
        class="order-status-card"
        :style="{ backgroundColor: card.bgColor }"
        @click="goOrderList(card.status)">
        <view class="card-left">
          <uni-icons :type="card.icon" size="24" :color="card.iconColor"></uni-icons>
        </view>
        <view class="card-center">
          <text class="status-label">{{ card.label }}</text>
        </view>
        <view class="card-right">
          <text class="status-count app-text-primary">{{ orderCount[card.key] || 0 }}</text>
        </view>
      </view>
    </view>

    <!-- 自定义列表项 -->
    <view class="app-card">
      <view class="app-list-item" @click="goInfo">
        <text>个人信息（含收货地址管理）</text>
        <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
      </view>
      <view class="app-list-item" @click="goExchange">
        <text>积分兑换</text>
        <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
      </view>
      <view class="app-list-item" @click="goExchangeRecords">
        <text>兑换记录</text>
        <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
      </view>
      <view v-if="isAdmin" class="app-list-item" @click="goAdminPanel">
        <text>管理后台（管理员后台操作入口）</text>
        <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
      </view>
    </view>

    <button class="app-btn app-btn-warn logout-btn" type="warn" @click="logout">退出登录</button>
  </view>
</template>

<script>
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatPrice } from '@/utils/common.js';

const db = uniCloud.database();
const dbCmd = db.command;

export default {
  data() {
    return {
      orderCount: { all: 0, status0: 0, status1: 0, status2: 0, status3: 0 ,status4: 0},
      pendingScore: 0,
      userScore: 0,
      orderStatusCards: [
        { key: 'all', status: undefined, label: '全部订单', icon: 'list', iconColor: '#007aff', bgColor: '#f9f9f9' },
        { key: 'status0', status: 0, label: '待处理', icon: 'paperplane', iconColor: '#ff9800', bgColor: '#fff3e0' },
		{ key: 'status4', status: 4, label: '已出单', icon: '', iconColor: '#f44336', bgColor: '#fbe9e7' },
        { key: 'status1', status: 1, label: '配送中', icon: 'upload', iconColor: '#2196f3', bgColor: '#e3f2fd' },
        { key: 'status2', status: 2, label: '已收货', icon: 'checkmarkempty', iconColor: '#4caf50', bgColor: '#e8f5e8' },
        { key: 'status3', status: 3, label: '已取消', icon: 'close', iconColor: '#f44336', bgColor: '#fbe9e7' },
		
      ]
    };
  },
  computed: {
    userInfo() { return store.userInfo; },
    isAdmin() {
      const role = this.userInfo?.role || [];
      return Array.isArray(role) ? role.includes('admin') : role === 'admin';
    },
    avatarUrl() {
      const user = this.userInfo || {};
      return user.avatar_file?.url || user.avatarFile?.url;
    }
  },
  onShow() {
    if (!this.checkLogin()) return;
    this.loadOrderCount();
    this.loadUserScore();
  },
  methods: {
    formatPrice,
    async loadUserScore() {
      const userId = this.userInfo?._id;
      if (!userId) return;
      try {
        const res = await db.collection('uni-id-users').doc(userId).field('score').get();
        this.userScore = res.result.data?.[0]?.score || 0;
      } catch (err) {
        console.error('获取用户积分失败', err);
        this.userScore = 0;
      }
    },
    checkLogin() {
      if (!store.userInfo || !store.userInfo._id) {
        uni.navigateTo({
          url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd',
          fail: () => { uni.redirectTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' }); }
        });
        return false;
      }
      return true;
    },
    goUserInfo() {
      if (!this.checkLogin()) return;
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo' });
    },
    goInfo() { if (this.checkLogin()) uni.navigateTo({ url: '../user/info' }); },
    goExchange() { if (this.checkLogin()) uni.navigateTo({ url: '../exchange/exchange' }); },
    goExchangeRecords() { if (this.checkLogin()) uni.navigateTo({ url: '../exchange/records' }); },
    goOrderList(status) {
      if (!this.checkLogin()) return;
      let url = '/pages/order/list';
      if (status !== undefined && status !== null) {
        url += `?status=${status}`;
      }
      uni.navigateTo({ url });
    },
    goAdminPanel() {
      if (!this.checkLogin()) return;
      uni.navigateTo({
        url: '../pages_admin/index/index',
        fail: (err) => {
          console.error('跳转失败', err);
          uni.showToast({ title: '管理端页面不存在', icon: 'none' });
        }
      });
    },
    async loadOrderCount() {
      const userId = this.userInfo._id;
      if (!userId) return;
      try {
        const [allRes, s0, s1, s2, s3, s4] = await Promise.all([
          db.collection('uni-pay-orders').where({ user_id: userId }).count(),
          db.collection('uni-pay-orders').where({ user_id: userId, status: 0 }).count(),
          db.collection('uni-pay-orders').where({ user_id: userId, status: 1 }).count(),
          db.collection('uni-pay-orders').where({ user_id: userId, status: 2 }).count(),
          db.collection('uni-pay-orders').where({ user_id: userId, status: 3 }).count(),
		  db.collection('uni-pay-orders').where({ user_id: userId, status: 4 }).count(),
        ]);
        this.orderCount = {
          all: allRes.result.total || 0,
          status0: s0.result.total || 0,
          status1: s1.result.total || 0,
          status2: s2.result.total || 0,
          status3: s3.result.total || 0,
		  status4: s4.result.total || 0
        };
        const pendingRes = await db.collection('uni-pay-orders')
          .where({ user_id: userId, status: dbCmd.in([0, 4, 1]) })
          .get();
        const pendingOrders = pendingRes?.result?.data || [];
        this.pendingScore = pendingOrders.reduce((sum, item) => sum + (item.score_earned || 0), 0);
      } catch (err) {
        console.error('加载订单统计失败', err);
      }
    },
    logout() {
      mutations.logout();
      uni.reLaunch({ url: '/pages/index/index' });
    }
  }
};
</script>

<style scoped>
.user-header {
  display: flex;
  align-items: center;
  padding: 20px;
  margin-bottom: 10px;
}
.avatar {
  width: 60px;
  height: 60px;
  border-radius: 30px;
  margin-right: 15px;
  background-color: #f0f0f0;
}
.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.nickname {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}
.phone {
  font-size: 14px;
  color: #999;
  margin-top: 5px;
}
.score-section {
  display: flex;
  padding: 15px 20px;
  margin-bottom: 6px;
  justify-content: space-around;
}
.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.score-label {
  font-size: 14px;
  color: #666;
}
.score-value {
  font-size: 20px;
  margin-top: 5px;
}
.order-status-section {
  padding: 6px;
  margin-bottom: 6px;
}
.order-status-card {
  display: flex;
  align-items: center;
  height: 16px;
  padding: 12px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid #eee;
  transition: background-color 0.2s;
}
.order-status-card:active {
  background-color: #e0e0e0;
}
.card-left {
  width: 40px;
  display: flex;
  justify-content: center;
  margin-right: 10px;
}
.card-center {
  flex: 1;
}
.status-label {
  font-size: 16px;
  color: #333;
}
.card-right {
  width: 50px;
  text-align: right;
}
.status-count {
  font-size: 20px;
}
.logout-btn {
  margin: 30px 20px;
  border-radius: 8px;
}
</style>