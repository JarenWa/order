<template>
  <view class="app-container">
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="uni-pay-orders"
      :where="`_id == '${orderId}'`"
      :getone="true"
    >
      <view v-if="error" class="app-error">{{ error.message }}</view>
      <view v-else-if="loading" class="app-loading">加载中...</view>
      <view v-else-if="data" class="app-card-flat detail-card">
        <view class="status-section">
          <text class="status app-status-tag" :class="'app-status-' + data.status">{{ getStatusText(data.status) }}</text>
        </view>

        <!-- 地址信息 -->
        <view class="address-section">
          <text class="app-section-title">收货信息</text>
          <text class="name">{{ data.user_address.user_name }} {{ data.user_address.mobile }}</text>
          <text class="address">{{ data.user_address.formatted_address }}</text>
        </view>
		
	

        <!-- 商品列表 -->
        <view class="goods-section">
          <text class="app-section-title">商品清单</text>
          <view v-for="(good, index) in data.goods_list" :key="index" class="app-goods-item">
            <image class="app-goods-image-sm" :src="good.image || '/static/tab/goods-default.png'" mode="aspectFill"></image>
            <view class="app-goods-info">
              <text class="app-goods-name">{{ good.name }}</text>
              <text class="app-goods-standard">{{ good.standard }}</text>
              <text class="app-goods-price-sm">¥{{ formatPrice(good.price) }} x {{ good.count }}</text>
            </view>
            <text class="app-text-price">¥{{ formatPrice(good.total) }}</text>
          </view>
        </view>

        <!-- 金额信息 -->
        <view class="amount-section">
          <view class="app-info-row">
            <text>参考总金额</text>
            <text>¥{{ formatPrice(data.total_amount) }}</text>
          </view>
          <view class="app-info-row">
            <text>实付总金额</text>
            <text class="app-text-price">¥{{ formatPrice(data.actual_payment) }}</text>
          </view>
          <view class="app-info-row">
            <text>获得积分</text>
            <text>{{ formatPrice(data.score_earned) }}</text>
          </view>
        </view>

        <!-- 订单信息 -->
        <view class="order-info">
          <text>订单号：{{ data.order_no }}</text>
          <text>创建时间：{{ formatDate(data.create_date) }}</text>
          <text v-if="data.cancel_date">取消时间：{{ formatDate(data.cancel_date) }}</text>
        </view>

        <!-- 底部按钮 -->
        <view class="action-buttons">
          <button v-if="data.status === 0" class="app-btn app-btn-warn" type="warn" @click="cancelOrder">取消订单</button>
          <button v-if="data.status === 2" class="app-btn app-btn-ghost" type="primary" disabled>订单已完成</button>
        </view>
      </view>
    </unicloud-db>
  </view>
</template>

<script>
import { formatDate, formatPrice, getOrderStatusText } from '@/utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return { orderId: '' };
  },
  onLoad(options) {
    this.orderId = options.id;
  },
  methods: {
    formatDate,
    formatPrice,
    getStatusText(status) {
      return getOrderStatusText(status);
    },
    cancelOrder() {
      uni.showModal({
        title: '提示',
        content: '确定取消该订单？',
        success: (res) => {
          if (res.confirm) {
            db.collection('uni-pay-orders').doc(this.orderId).update({
              status: 3,
              cancel_date: Date.now()
            }).then(() => {
              uni.showToast({ title: '已取消', icon: 'success' });
              this.$refs.udb.loadData({ clear: true });
            }).catch(err => {
              uni.showModal({ content: err.message, showCancel: false });
            });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.detail-card { padding: 15px; }
.status-section { text-align: center; margin-bottom: 15px; }
.status { font-size: 20px; }
.address-section { margin-bottom: 15px; }
.name { font-size: 14px; }
.address { font-size: 14px; color: #666; margin-top: 4px; }
.goods-section { margin-bottom: 15px; }
.amount-section { border-top: 1px solid #eee; padding-top: 10px; margin-bottom: 15px; }
.order-info { border-top: 1px solid #eee; padding-top: 10px; margin-bottom: 20px; }
.order-info text { display: block; font-size: 12px; color: #999; margin-bottom: 4px; }
.action-buttons { display: flex; gap: 10px; }
.action-buttons button { flex: 1; }
</style>