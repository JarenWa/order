<template>
  <view class="record-container">
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="exchange_records"
      :where="`user_id == '${userId}'`"
      orderby="create_date desc"
      :manual="true"
    >
      <view v-if="error" class="error">{{ error.message }}</view>
      <view v-else-if="loading" class="loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="record-list">
        <view v-for="item in data" :key="item._id" class="record-card">
          <view class="header">
            <text class="goods-name">{{ item.goods_name }}</text>
            <text class="status" :class="'status-' + item.status">{{ getStatusText(item) }}</text>
          </view>
          <view class="info">
            <text>规格：{{ item.standard || '-' }} </text>
            <text>数量：{{ item.quantity }}</text>
          </view>
          <view class="info">
            <text>积分耗费：{{ (item.points_used / 100).toFixed(2) }}</text>
          </view>
          <view class="address">
            <text>收货人：{{ item.consignee }} {{ item.mobile }}</text>
            <text>地址：{{ item.address }}</text>
            <text>创建时间：{{ formatDate(item.create_date) }}</text>
          </view>
          <view class="actions">
            <!-- 待发货：显示取消按钮 -->
            <button v-if="item.status === 0" class="cancel-btn" size="mini" @click="cancelOrder(item)">取消</button>
            <!-- 配送中：显示确认收货按钮 -->
            <button v-if="item.status === 1" class="receive-btn" size="mini" @click="confirmReceive(item)">收货</button>
            <!-- 已取消：显示删除按钮 -->
            <button v-if="item.status === 3" class="delete-btn" size="mini" @click="deleteOrder(item)">删除</button>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无兑换记录</view>
    </unicloud-db>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();

export default {
  data() {
    return {
      userId: store.userInfo?._id || ''
    };
  },
  onShow() {
    this.$refs.udb?.loadData({ clear: true });
  },
  methods: {
    formatDate(timestamp) {
      if (!timestamp) return '-';
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    getStatusText(item) {
      if (item.status === 0) return '待发货';
      if (item.status === 1) return '配送中';
      if (item.status === 2) return item.admin_completed ? '(后台)已完成' : '已完成';
      if (item.status === 3) return item.admin_cancelled ? '(后台)已取消' : '已取消';
      return '未知';
    },
    async cancelOrder(item) {
      uni.showModal({
        title: '提示',
        content: '确定取消该订单？取消后将退回积分。',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中...' });
            try {
              const result = await uniCloud.callFunction({
                name: 'cancelExchangeOrder',
                data: { recordId: item._id, userId: this.userId }
              });
              if (result.result.code === 0) {
                uni.showToast({ title: '已取消', icon: 'success' });
                this.$refs.udb.loadData({ clear: true });
              } else {
                uni.showModal({ content: result.result.message, showCancel: false });
              }
            } catch (err) {
              console.error(err);
              uni.showToast({ title: '取消失败', icon: 'none' });
            } finally {
              uni.hideLoading();
            }
          }
        }
      });
    },
    // 新增：确认收货
    async confirmReceive(item) {
      uni.showModal({
        title: '提示',
        content: '确认已收到商品？',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中...' });
            try {
              const result = await uniCloud.callFunction({
                name: 'completeExchangeOrder', // 复用云函数
                data: { recordId: item._id, userId: this.userId }
              });
              if (result.result.code === 0) {
                uni.showToast({ title: '确认成功', icon: 'success' });
                this.$refs.udb.loadData({ clear: true });
              } else {
                uni.showModal({ content: result.result.message, showCancel: false });
              }
            } catch (err) {
              console.error(err);
              uni.showToast({ title: '操作失败', icon: 'none' });
            } finally {
              uni.hideLoading();
            }
          }
        }
      });
    },
    async deleteOrder(item) {
      uni.showModal({
        title: '提示',
        content: '确定删除该订单？',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '删除中...' });
            try {
              await db.collection('exchange_records').doc(item._id).remove();
              uni.showToast({ title: '删除成功', icon: 'success' });
              this.$refs.udb.loadData({ clear: true });
            } catch (err) {
              console.error(err);
              uni.showToast({ title: '删除失败', icon: 'none' });
            } finally {
              uni.hideLoading();
            }
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.record-container { padding: 10px; background-color: #f5f5f5; min-height: 100vh; }
.record-card { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.goods-name { font-size: 16px; font-weight: bold; }
.status { font-size: 12px; padding: 2px 8px; border-radius: 12px; }
.status-0 { background-color: #ff9800; color: #fff; }
.status-1 { background-color: #2196f3; color: #fff; }
.status-2 { background-color: #4caf50; color: #fff; }
.status-3 { background-color: #999; color: #fff; }
.info, .address { font-size: 13px; color: #666; margin-bottom: 6px; }
.address text { display: block; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.cancel-btn, .receive-btn, .delete-btn { margin: 0; padding: 4px 12px; font-size: 12px; }
.cancel-btn { background-color: #ff9800; color: #fff; }
.receive-btn { background-color: #4caf50; color: #fff; }
.delete-btn { background-color: #f44336; color: #fff; }
</style>