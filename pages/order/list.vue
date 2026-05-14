<template>
  <view class="app-container">
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="uni-pay-orders"
      :where="whereCondition"
      orderby="create_date desc"
    >
      <view v-if="error" class="app-error">{{ error.message }}</view>
      <view v-else-if="loading" class="app-loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="order-list">
        <view v-for="item in data" :key="item._id" class="app-card-flat order-item">
          <view class="order-header" @click="goDetail(item._id)">
            <text v-if="item.is_pre_order" class="order-pre">预售订单</text>
            <text class="order-no">订单号：{{ item.order_no }}</text>
            <text class="app-status-tag" :class="'app-status-' + item.status">{{ getStatusText(item) }}</text>
          </view>
          <view class="order-date app-text-grey">创建时间：{{ formatDate(item.create_date) }}</view>
          <view class="goods-list" @click="goDetail(item._id)">
            <view v-for="(good, index) in item.goods_list" :key="index" class="app-goods-item">
              <view class="app-goods-info">
                <text class="app-goods-name">{{ good.name }}</text>
                <text class="app-goods-standard">{{ good.standard }}</text>
                <text class="app-goods-price-sm">¥{{ formatPrice(good.price) }} x {{ good.count }}</text>
              </view>
            </view>
          </view>
          <view class="order-footer">
            <text class="total">共 {{ item.goods_list.length }} 件 合计 ¥{{ formatPrice(item.total_amount) }}</text>
          </view>

          <view class="action-buttons">
            <button v-if="item.status === 0 || item.status === 4" class="action-btn cancel" size="mini" @click="confirmCancel(item._id)">取消</button>
            <button v-if="item.status === 0" class="action-btn edit" size="mini" @click="editOrder(item._id)">修改</button>
            <button v-if="item.status === 1" class="action-btn confirm" size="mini" @click="confirmReceive(item._id)">确认收货</button>
            <button v-if="item.status === 3" class="action-btn delete" size="mini" @click="confirmDelete(item._id)">删除</button>
          </view>
        </view>
      </view>
      <view v-else class="app-empty">暂无订单</view>
    </unicloud-db>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatDate, formatPrice, getOrderStatusText } from '@/utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      userInfo: store.userInfo,
      status: null,
    };
  },
  computed: {
    whereCondition() {
      const condition = { user_id: this.userInfo._id };
      if (this.status !== null && this.status >= 0) {
        condition.status = this.status;
      }
      return condition;
    }
  },
  onLoad(options) {
    if (!this.userInfo || !this.userInfo._id) {
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' });
      return;
    }
    if (options.status !== undefined) {
      this.status = parseInt(options.status, 10);
    }
  },
  methods: {
    formatDate,
    formatPrice,
    getStatusText(item) {
      return getOrderStatusText(item.status, {
        admin_cancelled: item.admin_cancelled,
        admin_completed: item.admin_completed,
        admin_modified: item.admin_modified
      });
    },
    goDetail(id) {
      uni.navigateTo({ url: './detail?id=' + id });
    },
    confirmCancel(orderId) {
      uni.showModal({
        title: '提示',
        content: '确定要取消该订单吗？',
        confirmText: '要取消',
        cancelText: '不取消',
        success: (res) => {
          if (res.confirm) {
            this.cancelOrder(orderId);
          }
        }
      });
    },
    async cancelOrder(orderId) {
      uni.showLoading({ title: '处理中...' });
      try {
        const res = await uniCloud.callFunction({
          name: 'cancelOrder',
          data: { orderId, cancelType: 'user' }
        });
        if (res.result.code === 0) {
          uni.hideLoading();
          uni.showToast({ title: '已取消', icon: 'success' });
          this.$refs.udb.loadData({ clear: true });
        } else {
          uni.hideLoading();
          uni.showModal({ content: res.result.message || '取消失败', showCancel: false });
        }
      } catch (err) {
        uni.hideLoading();
        console.error('取消订单失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      }
    },
    editOrder(orderId) {
      uni.navigateTo({
        url: '../order/edit?id=' + orderId,
        events: {
          refreshData: () => {
            this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    confirmReceive(orderId) {
      uni.showModal({
        title: '提示',
        content: '确认已收到商品？',
        confirmText: '确认收货',
        cancelText: '再想想',
        success: (res) => {
          if (res.confirm) {
            this.receiveOrder(orderId);
          }
        }
      });
    },
    async receiveOrder(orderId) {
      uni.showLoading({ title: '处理中...' });
      try {
        const res = await uniCloud.callFunction({
          name: 'confirmReceive',
          data: { orderId: orderId, userId: this.userInfo._id }
        });
        if (res.result.code === 0) {
          uni.hideLoading();
          uni.showToast({ title: '确认收货成功', icon: 'success' });
          this.$refs.udb.loadData({ clear: true });
        } else {
          uni.hideLoading();
          uni.showModal({ content: res.result.message, showCancel: false });
        }
      } catch (err) {
        uni.hideLoading();
        console.error('确认收货失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      }
    },
    confirmDelete(orderId) {
      uni.showModal({
        title: '提示',
        content: '确定要删除该订单吗？此操作不可恢复。',
        confirmText: '删除',
        cancelText: '保留',
        success: (res) => {
          if (res.confirm) {
            this.deleteOrder(orderId);
          }
        }
      });
    },
    async deleteOrder(orderId) {
      uni.showLoading({ title: '删除中...' });
      try {
        await db.collection('uni-pay-orders').doc(orderId).remove();
        uni.hideLoading();
        uni.showToast({ title: '删除成功', icon: 'success' });
        this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        uni.hideLoading();
        console.error('删除订单失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      }
    }
  }
};
</script>

<style scoped>
.order-item { padding: 12px; margin-bottom: 10px; }
.order-header { display: flex; justify-content: space-between; margin-bottom: 10px; cursor: pointer; }
.order-no { font-size: 12px; color: #999; }
.order-pre { font-size: 12px; font-weight: bold; color: #55aaff; }
.order-date { font-size: 12px; margin-bottom: 8px; }
.goods-list { margin-bottom: 8px; cursor: pointer; }
.order-footer { margin-top: 8px; text-align: right; }
.total { font-size: 14px; color: #333; }
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}
.action-btn {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 4px;
  margin: 0;
}
.action-btn.cancel { background-color: #ff9800; color: #fff; border: none; }
.action-btn.edit { background-color: #2196f3; color: #fff; border: none; }
.action-btn.confirm { background-color: #4caf50; color: #fff; border: none; }
.action-btn.delete { background-color: #f44336; color: #fff; border: none; }
</style>
