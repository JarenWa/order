<template>
  <view class="app-container-no-padding">
    <!-- 头部用户信息横幅 -->
    <view class="app-user-banner" @click="goUserInfo">
      <image class="app-user-banner-avatar" :src="avatarUrl" mode="aspectFill"></image>
      <view class="app-user-banner-info">
        <text class="app-user-banner-name">{{ userInfo.nickname || '未设置昵称' }}</text>
        <text class="app-user-banner-phone">{{ userInfo.mobile || '未绑定手机号[!请点击绑定]' }}</text>
      </view>
      <uni-icons type="arrowright" size="20" color="rgba(255,255,255,0.8)"></uni-icons>
    </view>

    <!-- 积分统计面板 -->
    <view class="app-score-board">
      <view class="app-score-board-item">
        <text class="app-score-board-value">{{ formatPrice(userScore) }}</text>
        <text class="app-score-board-label">已获积分</text>
      </view>
      <view class="app-score-board-item">
        <text class="app-score-board-value">{{ formatPrice(pendingScore) }}</text>
        <text class="app-score-board-label">待获积分</text>
      </view>
    </view>

    <!-- 订单状态网格 -->
    <view class="app-card" style="margin: 10px; border-radius: 12px;">
      <view class="app-status-grid">
        <view v-for="(card, idx) in orderStatusCards" :key="idx"
          class="app-status-grid-item"
          @click="goOrderList(card.status)">
          <view class="app-status-grid-icon" :style="{ backgroundColor: card.bgColor }">
            <uni-icons :type="card.icon" size="22" :color="card.iconColor"></uni-icons>
          </view>
          <text v-if="orderCount[card.key] > 0" class="app-status-grid-badge">{{ orderCount[card.key] }}</text>
          <text class="app-status-grid-label">{{ card.label }}</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单列表 -->
    <view class="app-card" style="margin: 10px; border-radius: 12px; padding: 0;">
      <view class="app-menu-list-item" @click="goInfo">
        <text class="app-menu-list-text">个人信息（含收货地址管理）</text>
        <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
      </view>
      <view class="app-menu-list-item" @click="goExchange">
        <text class="app-menu-list-text">积分兑换</text>
        <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
      </view>
      <view class="app-menu-list-item" @click="goExchangeRecords">
        <text class="app-menu-list-text">兑换记录</text>
        <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
      </view>
      <view v-if="isAdmin" class="app-menu-list-item" @click="goAdminPanel">
        <text class="app-menu-list-text">管理后台</text>
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
        { key: 'all', status: undefined, label: '全部', icon: 'list', iconColor: '#607d8b', bgColor: '#f5f7fa' },
        { key: 'status0', status: 0, label: '待处理', icon: 'paperplane', iconColor: '#ff9800', bgColor: '#fff3e0' },
        { key: 'status4', status: 4, label: '已出单', icon: 'compose', iconColor: '#ff5722', bgColor: '#fbe9e7' },
        { key: 'status1', status: 1, label: '配送中', icon: 'upload', iconColor: '#2196f3', bgColor: '#e3f2fd' },
        { key: 'status2', status: 2, label: '已收货', icon: 'checkmarkempty', iconColor: '#4caf50', bgColor: '#e8f5e8' },
        { key: 'status3', status: 3, label: '已取消', icon: 'close', iconColor: '#9e9e9e', bgColor: '#f5f5f5' }
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
.logout-btn {
  margin: 30px 20px;
  border-radius: 8px;
}
</style>