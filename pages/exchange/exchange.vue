<template>
  <view class="app-container-no-padding">
    <!-- 用户积分显示 -->
    <view class="app-card score-bar">
      <text class="label">我的积分：</text>
      <text class="score app-text-price">{{ formatPrice(userScore) }}</text>
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
        <view v-if="error" class="app-error">{{ error.message }}</view>
        <view v-else-if="loading" class="app-loading">加载中...</view>
        <view v-else-if="data && data.length > 0" class="goods-list">
          <view v-for="item in data" :key="item._id" class="app-card app-goods-item goods-card">
            <image class="app-goods-image" :src="item.image" mode="aspectFill"></image>
            <view class="app-goods-info">
              <view class="info-header">
                <text class="app-goods-name">{{ item.name }}</text>
                <text class="points app-text-price">{{ formatPrice(item.points_required, false) }}积分</text>
              </view>
              <text class="app-goods-standard">规格：{{ item.standard || '-' }}</text>
              <text class="stock app-text-grey">库存：{{ item.stock }}</text>
              <text class="description app-text-grey">{{ item.description}}</text>
            </view>
            <button
              class="app-btn app-btn-primary exchange-btn"
              :disabled="item.stock <= 0 || userScore < item.points_required"
              @click="goConfirm(item)"
            >
              兑换
            </button>
          </view>
        </view>
        <view v-else class="app-empty">暂无上架物品</view>
      </unicloud-db>
    </scroll-view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatPrice } from '@/utils/common.js';

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
    formatPrice,
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
.score-bar {
  padding: 15px;
  margin: 10px;
  font-size: 16px;
}
.goods-scroll {
  flex: 1;
  height: 0;
}
.goods-list {
  padding: 0 10px;
}
.goods-card {
  margin-bottom: 12px;
  align-items: flex-start;
  transition: all 0.2s;
}
.goods-card:active {
  transform: scale(0.98);
}
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.points {
  font-size: 14px;
  white-space: nowrap;
  margin-left: 8px;
}
.stock {
  margin-bottom: 6px;
  display: block;
}
.description {
  word-wrap: break-word;
  white-space: normal;
}
.exchange-btn {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  flex-shrink: 0;
  align-self: center;
}
.exchange-btn[disabled] {
  background-color: #ccc;
}
</style>