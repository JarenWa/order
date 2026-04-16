<template>
  <view class="container">
    <!-- 用户积分显示 -->
    <view class="score-bar">
      <text class="label">我的积分：</text>
      <text class="score">{{ (userScore / 100).toFixed(2) }}</text>
    </view>

    <!-- 可兑换物品列表 -->
    <scroll-view scroll-y class="goods-scroll">
      <unicloud-db
        ref="udb"
        v-slot:default="{ data, loading, error }"
        collection="exchange_goods"
        :where="{ status: 0 }"
        orderby="create_date desc"
        :page-size="20"
        :manual="true"
      >
        <view v-if="error" class="error">{{ error.message }}</view>
        <view v-else-if="loading" class="loading">加载中...</view>
        <view v-else-if="data && data.length > 0" class="goods-list">
          <view v-for="item in data" :key="item._id" class="goods-card">
            <image class="goods-image" :src="item.image" mode="aspectFill"></image>
            <view class="goods-info">
              <view class="info-header">
                <text class="name">{{ item.name }}</text>
				<text class="points">{{ (item.points_required / 100).toFixed(2) }}积分</text>
              </view>
			  
              <text class="standard">规格：{{ item.standard || '-' }}</text>
              <text class="stock">库存：{{ item.stock }}</text>
              <text class="description">{{ item.description}}</text>
            </view>
            <button
              class="exchange-btn"
              :disabled="item.stock <= 0 || userScore < item.points_required"
              @click="goConfirm(item)"
            >
              兑换
            </button>
          </view>
        </view>
        <view v-else class="empty">暂无上架物品</view>
      </unicloud-db>
    </scroll-view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      userScore: 0,
      userId: ''
    };
  },
  onShow() {
    this.loadUserScore();
    this.loadGoods();
  },
  methods: {
    async loadUserScore() {
      const userId = store.userInfo?._id;
      if (!userId) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      this.userId = userId;
      try {
        const res = await db.collection('uni-id-users').doc(userId).field('score').get();
        const userData = res.result?.data?.[0];
        this.userScore = userData?.score || 0;
      } catch (err) {
        console.error('获取用户积分失败', err);
        this.userScore = 0;
      }
    },
    loadGoods() {
      this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },
    goConfirm(item) {
      uni.navigateTo({
        url: `../exchange/confirm?goodsId=${item._id}`
      });
    }
  }
};
</script>

<style scoped>
.container {
  height: 100%;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}
.score-bar {
  background-color: #fff;
  padding: 15px;
  margin: 10px;
  border-radius: 8px;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.score {
  color: #ff6000;
  font-weight: bold;
}
.goods-scroll {
  flex: 1;
}
.goods-list {
  padding: 0 10px;
}
.goods-card {
  background-color: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.2s;
}
.goods-card:active {
  transform: scale(0.98);
}
.goods-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  margin-right: 12px;
  object-fit: cover;
  flex-shrink: 0;
}
.goods-info {
  flex: 1;
  min-width: 0;
}
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  /* overflow: hidden;
  text-overflow: ellipsis; */
  word-wrap: break-word;
  white-space: normal;
}
.points {
  font-size: 14px;
  color: #ff6000;
  font-weight: bold;
  white-space: nowrap;
  margin-left: 8px;
}
.standard {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
  display: block;
}
.stock {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
  display: block;
}
.description {
  font-size: 12px;
  color: #999;
  word-wrap: break-word;
  white-space: normal;
  /* overflow: hidden;
  text-overflow: ellipsis; 
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;*/
}
.exchange-btn {
  background-color: #409eff;
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  margin: 0;
  flex-shrink: 0;
  align-self: center;
}
.exchange-btn[disabled] {
  background-color: #ccc;
}
.error, .loading, .empty {
  text-align: center;
  padding: 20px;
  color: #999;
}
</style>