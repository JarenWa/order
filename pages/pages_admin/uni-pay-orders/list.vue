<template>
  <scroll-view
    class="order-list-scroll"
    scroll-y
    refresher-enabled
    @refresherrefresh="onRefresh"
    @scrolltolower="loadMore"
    :refresher-triggered="refreshing"
  >
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, hasMore, error }"
      collection="uni-pay-orders"
      :where="whereCondition"
      orderby="create_date desc"
      :page-size="20"
      :manual="true"
    >
      <view v-if="error" class="error">{{ error.message }}</view>
      <view v-else-if="loading" class="loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="order-list">
        <view v-for="item in data" :key="item._id" class="order-item">
          <view class="order-header">
			  	<text class="order-pre">{{ getOrderIsPreText(item.is_pre_order) }}</text>
            <text class="order-no">订单号：{{ item.order_no }}</text>
            <text class="order-status" :class="'status-' + item.status">{{ getStatusText(item.status) }}</text>
          </view>
          <view class="address-info">
            <text>收货人：{{ item.consignee }} {{ item.mobile }}</text>
            <text>地址：{{ item.address }}</text>
          </view>
          <view class="goods-list">
            <view v-for="(good, index) in item.goods_list" :key="index" class="goods-item">
              <image class="goods-image" :src="good.image || '/static/default-goods.png'" mode="aspectFill"></image>
              <view class="goods-info">
                <text class="goods-name">{{ good.name }}</text>
                <text class="goods-standard">{{ good.standard }}</text>
                <text class="goods-price">¥{{ (good.price / 100).toFixed(2) }} x {{ good.count }}</text>
              </view>
            </view>
          </view>
          <view class="order-footer">
            <text class="total">合计：¥{{ (item.total_amount / 100).toFixed(2) }}</text>
            <text class="score">积分：{{ (item.score_earned / 100).toFixed(2) }}</text>
          </view>
          <view class="action-buttons">
            <button v-if="item.status === 0" class="action-btn edit" size="mini" @click="editOrder(item._id)">修改</button>
            <button v-if="item.status === 0" class="action-btn cancel" size="mini" @click="confirmCancel(item)">取消</button>
            <button v-if="item.status === 0" class="action-btn ship" size="mini" @click="confirmShip(item)">出货</button>
            <button v-if="item.status === 1" class="action-btn complete" size="mini" @click="confirmComplete(item)">完成</button>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无订单</view>
      <uni-load-more :status="loading ? 'loading' : (hasMore ? 'more' : 'noMore')" />
    </unicloud-db>
  </scroll-view>
</template>

<script>
const db = uniCloud.database();

export default {
  data() {
    return {
      refreshing: false,
      whereCondition: {}, // 可以根据需要添加筛选条件
    };
  },
  created() {
    this.$nextTick(() => {
      this.$refs.udb && this.$refs.udb.loadData();
    });
  },
  methods: {
    getStatusText(status) {
      const map = { 0: '待发货', 1: '配送中', 2: '已收货', 3: '已取消' };
      return map[status] || '未知';
    },
	getOrderIsPreText(is_pre_order) {
		if(is_pre_order ==true){
			return '预售订单';
		}
	 
	},
    onRefresh() {
      this.refreshing = true;
      this.$refs.udb.loadData({ clear: true }, () => {
        this.refreshing = false;
      });
    },
    loadMore() {
      this.$refs.udb.loadMore();
    },
    editOrder(id) {
      uni.navigateTo({
        url: './edit?id=' + id,
        events: {
          refreshData: () => {
            this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    confirmCancel(order) {
      uni.showModal({
        title: '提示',
        content: '确定要取消该订单吗？',
        cancelText: '不取消',
        confirmText: '取消订单',
        success: (res) => {
          if (res.confirm) {
            this.cancelOrder(order);
          }
        }
      });
    },
    async cancelOrder(order) {
      uni.showLoading({ title: '处理中...' });
      try {
        await db.collection('uni-pay-orders').doc(order._id).update({
          status: 3,
          admin_cancelled: true,
          update_date: Date.now()
        });
        uni.hideLoading();
        uni.showToast({ title: '已取消', icon: 'success' });
        this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        uni.hideLoading();
        console.error('取消订单失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      }
    },
    confirmShip(order) {
      uni.showModal({
        title: '提示',
        content: '确定要发货吗？',
        confirmText: '发货',
        success: (res) => {
          if (res.confirm) {
            this.shipOrder(order);
          }
        }
      });
    },
    async shipOrder(order) {
      uni.showLoading({ title: '处理中...' });
      try {
        await db.collection('uni-pay-orders').doc(order._id).update({
          status: 1,
          update_date: Date.now()
        });
        uni.hideLoading();
        uni.showToast({ title: '已发货', icon: 'success' });
        this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        uni.hideLoading();
        console.error('发货失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      }
    },
    confirmComplete(order) {
      uni.showModal({
        title: '提示',
        content: '确定要完成该订单吗？这将发放积分给用户。',
        confirmText: '完成',
        success: (res) => {
          if (res.confirm) {
            this.completeOrder(order);
          }
        }
      });
    },
    async completeOrder(order) {
      uni.showLoading({ title: '处理中...' });
      try {
        const res = await uniCloud.callFunction({
          name: 'adminCompleteOrder',
          data: {
            orderId: order._id,
            userId: order.user_id,
            scoreEarned: order.score_earned
          }
        });
        if (res.result.code === 0) {
          uni.hideLoading();
          uni.showToast({ title: '已完成', icon: 'success' });
          this.$refs.udb.loadData({ clear: true });
        } else {
          uni.hideLoading();
          uni.showModal({ content: res.result.message, showCancel: false });
        }
      } catch (err) {
        uni.hideLoading();
        console.error('完成订单失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      }
    }
  }
};
</script>

<style scoped>
.order-list-scroll {
  height: 100%;
  background-color: #f5f5f5;
}

.order-list { padding: 10px; }
.order-item { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.order-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.order-no { font-size: 12px; color: #999; }
.order-status { font-size: 12px; font-weight: bold; }
.status-0 { color: #ff9800; }
.status-1 { color: #2196f3; }
.status-2 { color: #4caf50; }
.status-3 { color: #999; }
.order-pre { font-size: 12px; font-weight: bold;color: #55aaff; }

.address-info { font-size: 13px; color: #666; margin-bottom: 8px; }
.address-info text { display: block; }
.goods-list { margin-bottom: 8px; }
.goods-item { display: flex; margin-bottom: 8px; }
.goods-image { width: 50px; height: 50px; border-radius: 4px; margin-right: 8px; }
.goods-info { flex: 1; }
.goods-name { font-size: 14px; }
.goods-standard { font-size: 12px; color: #999; }
.goods-price { font-size: 12px; color: #ff6000; }
.order-footer { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; }
.total { color: #333; }
.score { color: #666; }
.action-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; }
.action-btn { font-size: 12px; padding: 4px 12px; border-radius: 4px; margin: 0; }
.edit { background-color: #2196f3; color: #fff; }
.cancel { background-color: #ff9800; color: #fff; }
.ship { background-color: #4caf50; color: #fff; }
.complete { background-color: #9c27b0; color: #fff; }
.error, .loading, .empty { text-align: center; padding: 20px; color: #999; }
</style>