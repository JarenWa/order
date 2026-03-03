<template>
  <view class="detail-container">
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

        <!-- 订单基本信息 -->
        <view class="info-section">
          <text class="title">订单号：{{ data.order_no }}</text>
          <text class="item">创建时间：{{ formatDate(data.create_date) }}</text>
          <text class="item">最后更新：{{ formatDate(data.update_date) }}</text>
        </view>

        <!-- 收货信息 -->
        <view class="address-section">
          <text class="title">收货信息</text>
          <text class="item">收货人：{{ data.consignee }} {{ data.mobile }}</text>
          <text class="item">地址：{{ data.address }}</text>
        </view>

        <!-- 商品列表 -->
        <view class="goods-section">
          <text class="title">商品清单</text>
          <view v-for="(good, index) in data.goods_list" :key="index" class="goods-item">
            <image class="goods-image" :src="good.image || '/static/default-goods.png'" mode="aspectFill"></image>
            <view class="goods-info">
              <text class="goods-name">{{ good.name }}</text>
              <text class="goods-standard">{{ good.standard }}</text>
              <text class="goods-price">¥{{ (good.price / 100).toFixed(2) }} x {{ good.count }}</text>
            </view>
            <text class="goods-total">¥{{ (good.total / 100).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 金额和积分 -->
        <view class="amount-section">
          <view class="amount-row">
            <text>订单总金额</text>
            <text>¥{{ (data.total_amount / 100).toFixed(2) }}</text>
          </view>
          <view class="amount-row">
            <text>实付金额</text>
            <text class="real-pay">¥{{ (data.actual_payment / 100).toFixed(2) }}</text>
          </view>
          <view class="amount-row">
            <text>订单积分</text>
            <text>{{ (data.score_earned / 100).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 备注和后台标记 -->
        <view class="extra-section">
          <text class="item" v-if="data.remark">备注：{{ data.remark }}</text>
          <view class="admin-tags">
            <text v-if="data.admin_modified" class="tag modified">后台修改</text>
            <text v-if="data.admin_cancelled" class="tag cancelled">后台取消</text>
            <text v-if="data.admin_completed" class="tag completed">后台完成</text>
          </view>
        </view>

        <!-- 底部按钮（可返回列表） -->
        <button class="back-btn" @click="uni.navigateBack">返回</button>
      </view>
    </unicloud-db>
  </view>
</template>

<script>
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
    }
  }
};
</script>

<style scoped>
.detail-container { padding: 10px; background-color: #f5f5f5; min-height: 100vh; }
.detail-card { background-color: #fff; border-radius: 8px; padding: 15px; }
.status-section { text-align: center; margin-bottom: 15px; }
.status { font-size: 20px; font-weight: bold; }
.status-0 { color: #ff9800; }
.status-1 { color: #2196f3; }
.status-2 { color: #4caf50; }
.status-3 { color: #999; }
.info-section, .address-section, .goods-section, .amount-section, .extra-section {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.title { font-size: 16px; font-weight: bold; display: block; margin-bottom: 8px; }
.item { display: block; font-size: 14px; color: #666; margin-bottom: 4px; }
.goods-item { display: flex; align-items: center; margin-bottom: 8px; }
.goods-image { width: 50px; height: 50px; border-radius: 4px; margin-right: 8px; }
.goods-info { flex: 1; }
.goods-name { font-size: 14px; }
.goods-standard { font-size: 12px; color: #999; }
.goods-price { font-size: 12px; color: #ff6000; }
.goods-total { font-weight: bold; }
.amount-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
.real-pay { color: #ff6000; font-weight: bold; }
.admin-tags { display: flex; gap: 8px; margin-top: 8px; }
.tag { padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #fff; }
.modified { background-color: #2196f3; }
.cancelled { background-color: #ff9800; }
.completed { background-color: #4caf50; }
.back-btn { margin-top: 20px; }
</style>