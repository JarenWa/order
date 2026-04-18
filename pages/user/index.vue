<template>
  <view class="user-container">
    <!-- 头部用户信息区域 -->
    <view class="user-header" @click="goUserInfo">
      <image class="avatar" :src="avatarUrl" mode="aspectFill"></image>
      <view class="user-info">
        <text class="nickname">{{ userInfo.nickname || '未设置昵称' }}</text>
        <text class="phone">{{ userInfo.mobile || '未绑定手机号[!请点击绑定]' }}</text>
      </view>
      <uni-icons type="arrowright" size="20" color="#999"></uni-icons>
    </view>

    <!-- 积分统计卡片 -->
    <view class="score-section">
      <view class="score-item">
        <text class="score-label">已获积分</text>
        <text class="score-value">{{ (userScore / 100).toFixed(2) }}</text>
      </view>
      <view class="score-item">
        <text class="score-label">待获积分</text>
        <text class="score-value">{{ (pendingScore / 100).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 订单状态卡片区域 -->
    <view class="order-status-section">
      <!-- 全部订单卡片 -->
      <view class="order-status-card" @click="goOrderList()">
        <view class="card-left">
          <uni-icons type="list" size="24" color="#007aff"></uni-icons>
        </view>
        <view class="card-center">
          <text class="status-label">全部订单</text>
        </view>
        <view class="card-right">
          <text class="status-count">{{ orderCount.all || 0 }}</text>
        </view>
      </view>

      <!-- 待发货卡片 -->
      <view class="order-status-card" style="background-color:#fff3e0;" @click="goOrderList(0)">
        <view class="card-left">
          <uni-icons type="paperplane" size="24" color="#ff9800"></uni-icons>
        </view>
        <view class="card-center">
          <text class="status-label">待发货</text>
        </view>
        <view class="card-right">
          <text class="status-count">{{ orderCount.status0 || 0 }}</text>
        </view>
      </view>

      <!-- 配送中卡片 -->
      <view class="order-status-card" style="background-color:#e3f2fd;" @click="goOrderList(1)">
        <view class="card-left">
          <uni-icons type="upload" size="24" color="#2196f3"></uni-icons>
        </view>
        <view class="card-center">
          <text class="status-label">配送中</text>
        </view>
        <view class="card-right">
          <text class="status-count">{{ orderCount.status1 || 0 }}</text>
        </view>
      </view>

      <!-- 已收货卡片 -->
      <view class="order-status-card" style="background-color:#e8f5e8;" @click="goOrderList(2)">
        <view class="card-left">
          <uni-icons type="checkmarkempty" size="24" color="#4caf50"></uni-icons>
        </view>
        <view class="card-center">
          <text class="status-label">已收货</text>
        </view>
        <view class="card-right">
          <text class="status-count">{{ orderCount.status2 || 0 }}</text>
        </view>
      </view>

      <!-- 已取消卡片 -->
      <view class="order-status-card" style="background-color:#fbe9e7;" @click="goOrderList(3)">
        <view class="card-left">
          <uni-icons type="close" size="24" color="#f44336"></uni-icons>
        </view>
        <view class="card-center">
          <text class="status-label">已取消</text>
        </view>
        <view class="card-right">
          <text class="status-count">{{ orderCount.status3 || 0 }}</text>
        </view>
      </view>
    </view>

    <!-- 自定义列表项 -->
    <view class="custom-list-item" @click="goInfo">
      <view class="item-left">
        <text>个人信息（含收货地址管理）</text>
      </view>
      <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
    </view>
	
	<view class="custom-list-item" @click="goExchange">
	  <view class="item-left">
	    <text>积分兑换</text>
	  </view>
	  <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
	</view>
	
	<view class="custom-list-item" @click="goExchangeRecords">
	  <view class="item-left">
	    <text>兑换记录</text>
	  </view>
	  <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
	</view>

    <view v-if="isAdmin" class="custom-list-item" @click="goAdminPanel">
      <view class="item-left">
        <text>管理后台（管理员后台操作入口）</text>
      </view>
      <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
    </view>

    <button class="logout-btn" type="warn" @click="logout">退出登录</button>
  </view>
</template>

<script>
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();
const dbCmd = db.command;
export default {
  data() {
    return {
      orderCount: {
        all: 0,
        status0: 0,
        status1: 0,
        status2: 0,
        status3: 0
      },
      pendingScore: 0, // 待获积分
      isDev: process.env.NODE_ENV === 'development',
	  userScore: 0
    };
  },
  computed: {
    userInfo() {
      return store.userInfo;
    },
    role() {
      return uni.getStorageSync('role') || [];
    },
    isAdmin() {
      const role = this.userInfo?.role || [];
      console.log('当前角色:', role);
      return Array.isArray(role) ? role.includes('admin') : role === 'admin';
    },
	avatarUrl() {
	    const user = this.userInfo || {};
	    // 兼容 avatar_file 和 avatarFile 两种命名
	    return user.avatar_file?.url || user.avatarFile?.url ;
	  }
  },
  onShow() {
    console.log('onShow - store.userInfo:', store.userInfo);
    console.log('onShow - hasLogin:', store.hasLogin);
    if (!this.checkLogin()) return;
    this.loadOrderCount();
	 this.loadUserScore();
  },
  methods: {
	   async loadUserScore() {
	        const userId = this.userInfo?._id;
	        if (!userId) {
	          console.log('userId 为空，无法加载积分');
	          return;
	        }
	        try {
				const res = await db.collection('uni-id-users').doc(userId).field('score').get();
	          // const res = await db.collection('uni-id-users')
	          //   .where({_id:userId})
	          //   .get();

	          if (res.result.data && res.result.data.length > 0) {
	            this.userScore = res.result.data[0].score || 0;
	          } else {
	            this.userScore = 0;
	          }
	        } catch (err) {
	          console.error('获取用户积分失败', err);
	          this.userScore = 0;
	        }
	      },
    checkLogin() {
		console.log("store.userInfo",store.userInfo)
      if (!store.userInfo || !store.userInfo._id) {
        uni.navigateTo({
          url: '/pages/login/login',
          fail: () => {
            uni.redirectTo({ url: '/pages/login/login' });
          }
        });
        return false;
      }
      return true;
    },
    goUserInfo() {
      if (!this.checkLogin()) return;
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo' });
    },
	goInfo() {
	  if (!this.checkLogin()) return;
	  uni.navigateTo({ url: '../user/info' });
	},
	goExchange() {
		if (!this.checkLogin()) return;
		uni.navigateTo({ url: '../exchange/exchange' });
	},
		
	goExchangeRecords() {
		if (!this.checkLogin()) return;
		uni.navigateTo({ url: '../exchange/records' });
	},
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
      console.log('跳转管理后台');
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
            // 查询各状态订单数量
            const allRes = await db.collection('uni-pay-orders').where({ user_id: userId }).count();
            const status0Res = await db.collection('uni-pay-orders').where({ user_id: userId, status: 0 }).count();
            const status1Res = await db.collection('uni-pay-orders').where({ user_id: userId, status: 1 }).count();
            const status2Res = await db.collection('uni-pay-orders').where({ user_id: userId, status: 2 }).count();
            const status3Res = await db.collection('uni-pay-orders').where({ user_id: userId, status: 3 }).count();
    
            this.orderCount = {
              all: allRes.result.total || 0,
              status0: status0Res.result.total || 0,
              status1: status1Res.result.total || 0,
              status2: status2Res.result.total || 0,
              status3: status3Res.result.total || 0
            };
    
            // 计算待积分（状态0和1的订单积分和）
            const pendingRes = await db.collection('uni-pay-orders')
                  .where({
                    user_id: userId,
                    status: dbCmd.in([0, 1])
                  })
                  .get();
                const pendingOrders = pendingRes?.result?.data || [];
                let pendingScore = 0;
                pendingOrders.forEach(item => {
                  pendingScore += item.score_earned || 0;
                });
                this.pendingScore = pendingScore;
    
    
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
.user-container {
  background-color: #f5f5f5;
  min-height: 100vh;
}
.user-header {
  display: flex;
  align-items: center;
  background-color: #fff;
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

/* 积分统计卡片样式 */
.score-section {
  display: flex;
  background-color: #fff;
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
  font-weight: bold;
  color: #ff6000;
  margin-top: 5px;
}

.order-status-section {
  background-color: #fff;
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
  background-color: #f9f9f9;
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
  font-weight: bold;
  color: #007aff;
}
.custom-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  background-color: #fff;
  border-bottom: 1px solid #f5f5f5;
  font-size: 16px;
  color: #333;
}
.custom-list-item:active {
  background-color: #f5f5f5;
}
.logout-btn {
  margin: 30px 20px;
  border-radius: 8px;
}
</style>