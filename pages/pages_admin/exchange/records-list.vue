<template>
	  <view class="page-container">
	<!-- 顶部筛选行 -->
	<view class="filter-row">
	  <view class="filter-menu">
	    <picker @change="onStatusFilterChange" :value="statusIndex" :range="statusOptions">
	      <view class="picker">
	        {{ statusOptions[statusIndex] }}
	        <text class="uni-icon uni-icon-arrowdown">▼</text>
	      </view>
	    </picker>
	  </view>
	  <button class="filter-confirm-btn" size="mini" type="primary" @click="applyFilter">确认</button>
	</view>
  

 <scroll-view
      class="list-scroll"
      scroll-y
      refresher-enabled
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :refresher-triggered="refreshing"
    >

    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error,hasMore }"
      collection="exchange_records"
	  :key="refreshKey"
      :where="whereCondition"
      orderby="create_date desc"
      :page-size="20"
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
          <view class="action-buttons">
            <!-- 待发货：可取消、发货 -->
            <button v-if="item.status === 0" class="action-btn cancel" size="mini" @click="cancelOrder(item)">取消</button>
            <button v-if="item.status === 0" class="action-btn ship" size="mini" @click="shipOrder(item)">发货</button>
            <!-- 配送中：可确认收货 -->
            <button v-if="item.status === 1" class="action-btn complete" size="mini" @click="completeOrder(item)">确认收货</button>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无兑换记录</view>
	  <uni-load-more :status="loading ? 'loading' : (hasMore ? 'more' : 'noMore')" />
    </unicloud-db>
	  </scroll-view>
  </view>
</template>

<script>
const db = uniCloud.database();

export default {
  data() {
    return {
	  refreshKey: 0,
      statusFilter: null, // null,0,1,2,3
      statusOptions: ['全部兑换记录', '待发货', '配送中', '已收货', '已取消'],
      statusIndex: 0,
      // 定时刷新相关
      refreshTimer: null,
      refreshInterval: 10000, // 10秒刷新一次
    };
  },
  computed: {
    whereCondition() {
      const condition = {};
      if (this.statusFilter !== null) condition.status = this.statusFilter;
      return condition;
    }
  },
  created() {
    this.$nextTick(() => {
      this.$refs.udb && this.$refs.udb.loadData();
    });
  },
  onShow() {
    this.startRefreshTimer();
  },
  onHide() {
    this.clearRefreshTimer();
  },
  onUnload() {
    this.clearRefreshTimer();
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
    onStatusFilterChange(e) {
      this.statusIndex = Number(e.detail.value);
    },
    applyFilter() {
      const map = [null, 0, 1, 2, 3];
      this.statusFilter = map[this.statusIndex];
	  this.refreshKey++;
      //this.$refs.udb.loadData({ clear: true });
    },
    getStatusText(item) {
      if (item.status === 0) return '待发货';
      if (item.status === 1) return '配送中';
      if (item.status === 2) return item.admin_completed ? '(后台)已收货' : '已收货';
      if (item.status === 3) return item.admin_cancelled ? '(后台)已取消' : '已取消';
      return '未知';
    },
    // 取消订单（管理员）
    async cancelOrder(item) {
      uni.showModal({
        title: '提示',
        content: `确定取消订单“${item.goods_name}”？将退回积分并恢复库存。`,
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中...' });
            try {
              const result = await uniCloud.callFunction({
                name: 'adminCancelExchangeOrder',
                data: { recordId: item._id }
              });
              if (result.result.code === 0) {
                uni.showToast({ title: '已取消', icon: 'success' });
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
    // 发货（管理员）
    async shipOrder(item) {
      uni.showModal({
        title: '提示',
        content: `确认发货“${item.goods_name}”？`,
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中...' });
            try {
              const result = await uniCloud.callFunction({
                name: 'adminShipExchangeOrder',
                data: { recordId: item._id }
              });
              if (result.result.code === 0) {
                uni.showToast({ title: '已发货', icon: 'success' });
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
    // 确认收货（管理员）
    async completeOrder(item) {
      uni.showModal({
        title: '提示',
        content: `确认该订单已完成收货？`,
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中...' });
            try {
              const result = await uniCloud.callFunction({
                name: 'adminCompleteExchangeOrder',
                data: { recordId: item._id }
              });
              if (result.result.code === 0) {
                uni.showToast({ title: '已完成', icon: 'success' });
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
    // 定时刷新
    startRefreshTimer() {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.refreshTimer = setInterval(() => {
        this.refreshData();
      }, this.refreshInterval);
    },
    clearRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },
    refreshData() {
      if (this.$refs.udb) {
        this.$refs.udb.loadData({ clear: true });
      }
    }
  }
};
</script>

<style scoped>
/* 复用原样式，增加按钮样式 */
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;  
}
.list-scroll {
	flex: 0.92;
	overflow-y: auto;          
  /* height: 100%; */
  background-color: #f8f8f8;
}
.filter-row {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #fff;
  margin-bottom: 6px;
}
.filter-menu {
  flex: 1;
  margin-right: 10px;
}
.filter-confirm-btn {
  flex-shrink: 0;
  height: 36px;
  line-height: 36px;
  border-radius: 18px;
  font-size: 14px;
  padding: 0 15px;
}
.picker {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background-color: #f9f9f9;
}
.uni-icon-arrowdown {
  margin-left: 4px;
  font-size: 14px;
  color: #666;
}
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
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}
.action-btn {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 4px;
  margin: 0;
}
.cancel { background-color: #ff9800; color: #fff; }
.ship { background-color: #4caf50; color: #fff; }
.complete { background-color: #9c27b0; color: #fff; }
</style>