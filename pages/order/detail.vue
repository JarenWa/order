<template>
  <view class="order-detail-container">
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="uni-pay-orders"
      :where="`_id == '${orderId}'`"
      :getone="true"
    >
      <view v-if="error" class="error">{{ error.message }}</view>
      <view v-else-if="loading" class="loading">加载中...</view>
      <view v-else-if="data" class="detail-card">
        <view class="status-section">
          <text class="status" :class="'status-' + data.status">{{ getStatusText(data.status) }}</text>
        </view>

        <!-- 地址信息 -->
        <view class="address-section">
          <text class="label">收货信息</text>
          <text class="name">{{ data.consignee }} {{ data.mobile }}</text>
          <text class="address">{{ data.address }}</text>
        </view>

        <!-- 商品列表 -->
        <view class="goods-section">
          <text class="section-title">商品清单</text>
          <view v-for="(good, index) in data.goods_list" :key="index" class="goods-item">
            <image class="goods-image" :src="good.image || '/static/tab/goods-default.png'" mode="aspectFill"></image>
            <view class="goods-info">
              <text class="goods-name">{{ good.name }}</text>
              <text class="goods-standard">{{ good.standard }}</text>
              <text class="goods-price">¥{{ (good.price / 100).toFixed(2) }} x {{ good.count }}</text>
            </view>
            <text class="goods-total">¥{{ (good.total / 100).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 金额信息 -->
        <view class="amount-section">
          <view class="amount-row">
            <text>商品总额</text>
            <text>¥{{ (data.total_amount / 100).toFixed(2) }}</text>
          </view>
          <view class="amount-row">
            <text>实付金额</text>
            <text class="real-pay">¥{{ (data.actual_payment / 100).toFixed(2) }}</text>
          </view>
          <view class="amount-row">
            <text>获得积分</text>
            <text>{{ (data.score_earned / 100).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 订单信息 -->
        <view class="order-info">
          <text>订单号：{{ data.order_no }}</text>
          <text>创建时间：{{ formatDate(data.create_date) }}</text>
          <text v-if="data.cancel_date">取消时间：{{ formatDate(data.cancel_date) }}</text>
        </view>

        <!-- 底部按钮 -->
        <view class="btns">
          <button v-if="data.status === 0" type="warn" @click="cancelOrder">取消订单</button>
          <button v-if="data.status === 2" type="primary" disabled>订单已完成</button>
        </view>
      </view>
    </unicloud-db>
  </view>
</template>

<script>
const db = uniCloud.database();

export default {
  data() {
    return {
      orderId: '',
    };
  },
  onLoad(options) {
    this.orderId = options.id;
  },
  methods: {
    getStatusText(status) {
      const map = { 0: '待发货', 1: '配送中', 2: '已收货', 3: '已取消' };
      return map[status] || '未知';
    },
    formatDate(timestamp) {
      if (!timestamp) return '-';
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
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
.order-detail-container { padding: 10px; background-color: #f5f5f5; min-height: 100vh; }
.detail-card { background-color: #fff; border-radius: 8px; padding: 15px; }
.status-section { text-align: center; margin-bottom: 15px; }
.status { font-size: 20px; font-weight: bold; }
.status-0 { color: #ff9800; }
.status-1 { color: #2196f3; }
.status-2 { color: #4caf50; }
.status-3 { color: #999; }
.address-section { margin-bottom: 15px; }
.label { font-size: 16px; font-weight: bold; display: block; margin-bottom: 8px; }
.name { font-size: 14px; }
.address { font-size: 14px; color: #666; margin-top: 4px; }
.goods-section { margin-bottom: 15px; }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
.goods-item { display: flex; align-items: center; margin-bottom: 8px; }
.goods-image { width: 50px; height: 50px; border-radius: 4px; margin-right: 8px; }
.goods-info { flex: 1; }
.goods-name { font-size: 14px; }
.goods-standard { font-size: 12px; color: #999; }
.goods-price { font-size: 12px; color: #ff6000; }
.goods-total { font-weight: bold; }
.amount-section { border-top: 1px solid #eee; padding-top: 10px; margin-bottom: 15px; }
.amount-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
.real-pay { color: #ff6000; font-weight: bold; }
.order-info { border-top: 1px solid #eee; padding-top: 10px; margin-bottom: 20px; }
.order-info text { display: block; font-size: 12px; color: #999; margin-bottom: 4px; }
.btns { display: flex; gap: 10px; }
.btns button { flex: 1; }
</style>