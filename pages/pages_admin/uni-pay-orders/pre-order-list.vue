<template>
	<view class="page">
	<!-- 商品汇总区域（头部） -->
	 <view class="summary-title">预售商品待发货数量汇总</view>
	<view class="summary-card" v-if="summaryLoaded">
	 
	  <view v-if="summaryItems.length === 0" class="summary-empty">暂无预售商品</view>
	  <view v-else class="summary-list">
	    <view v-for="(item, idx) in summaryItems" :key="idx" class="summary-item">
	      <text class="summary-name">{{ item.name }} </text>
		  <text class="summary-standard">{{ item.standard }}</text>
	      <text class="summary-count">x {{ item.totalCount }}</text>
	    </view>
	  </view>
	</view>
	<view v-else-if="summaryLoading" class="summary-loading">加载汇总中...</view>
	
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
	  :key="refreshKey"
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
            <text class="order-pre">预售订单</text>
            <text class="order-no">订单号：{{ item.order_no }}</text>
            <text class="order-status" :class="'status-' + item.status">{{ getStatusText(item) }}</text>
          </view>
          <view class="address-info">
            <text>收货人：{{ item.consignee }} ;电话：{{ item.mobile }}</text>
            <text>地址：{{ item.address }}</text>
            <text>备注：{{ item.remark || "-" }}</text>
            <text>创建时间:{{ formatDate(item.create_date) }}</text>
          </view>
          <view class="goods-list">
            <view v-for="(good, index) in item.goods_list" :key="index" class="goods-item">
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
      <view v-else class="empty">暂无预售订单</view>
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
      refreshing: false,
      statusFilter: null, // null 表示全部，0,1,2,3 分别对应各状态
      statusOptions: ['全部订单', '待发货', '配送中', '已收货', '已取消'],
      statusIndex: 0,
      // 定时刷新相关
      refreshTimer: null,
      refreshInterval: 10000, // 10秒刷新一次
      // 商品汇总相关
      summaryItems: [],
      summaryLoading: true,
      summaryLoaded: false,
    };
  },
  computed: {
    whereCondition() {
      const condition = {
        is_pre_order: true  // 只查预售订单
      };
      if (this.statusFilter !== null) {
        condition.status = this.statusFilter;
      }
      return condition;
    }
  },
  created() {
    this.loadSummary(); // 加载商品汇总
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
    getStatusText(item) {
      const status = item.status;
      // 状态3（已取消）且 admin_cancelled 为 true 时，显示“后台已取消”
      if (status === 3 && item.admin_cancelled === true) {
        return '(后台)已取消';
      }
      // 状态2（已收货）且 admin_completed 为 true 时，显示“后台已收货”
      if (status === 2 && item.admin_completed === true) {
        return '(后台)已收货';
      }
      const map = { 0: '待发货', 1: '配送中', 2: '已收货', 3: '已取消' };
      return map[status] || '未知';
    },
    onStatusFilterChange(e) {
      this.statusIndex = Number(e.detail.value);
      // 不立即刷新，等待确认按钮触发
    },
    applyFilter() {
      const value = Number(this.statusIndex);
      if (value === 0) {
        this.statusFilter = null;
      } else {
        this.statusFilter = value - 1; // 1->0, 2->1, 3->2, 4->3
      }
	  this.refreshKey++;
      //this.$refs.udb && this.$refs.udb.loadData({ clear: true });
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
        url: '../uni-pay-orders/edit?id=' + id,
        events: {
          refreshData: () => {
            this.$refs.udb.loadData({ clear: true });
			this.loadSummary(); // 刷新汇总
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
        // 同时刷新汇总（因为商品数量可能减少）
        this.loadSummary();
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
		this.loadSummary(); // 刷新汇总（发货后该订单不再属于待发货）
      } catch (err) {
        uni.hideLoading();
        console.error('发货失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      }
    },
    confirmComplete(order) {
      uni.showModal({
        title: '提示',
        content: '确定要完成该订单吗？这将替用户完成收货，且发放积分给用户。',
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
    },

   // ========== 商品汇总相关 ==========
   async loadSummary() {
     this.summaryLoading = true;
     this.summaryLoaded = false;
     try {
       // 查询待发货的预售订单
       const res = await db.collection('uni-pay-orders')
         .where({
           is_pre_order: true,
           status: 0
         })
         .field('goods_list')
         .get();
		 
		 console.log(res),
		 console.log("res.result.data" ,res.result.data)
       if (res && res.result.data) {
         // 使用商品 ID 作为键，聚合数量
         const map = new Map(); // key: 商品ID, value: { name, standard, totalCount }
         res.result.data.forEach(order => {
           if (order.goods_list && Array.isArray(order.goods_list)) {
			   console.log("order" ,order)
             order.goods_list.forEach(good => {
               // 假设每个商品对象有唯一的  goods_id
               const goodsId = good.goods_id;
               if (!goodsId) {
                 console.warn('商品缺少唯一标识，使用名称+规格备用', good);
                 // 如果没有 ID，则使用名称+规格作为备用键（但仍建议数据结构中包含 ID）
                 const fallbackKey = `${good.name}|${good.standard || ''}`;
                 if (map.has(fallbackKey)) {
                   const existing = map.get(fallbackKey);
                   existing.totalCount += (good.count || 0);
                 } else {
                   map.set(fallbackKey, {
                     name: good.name,
                     standard: good.standard || '',
                     totalCount: good.count || 0
                   });
                 }
                 return;
               }
               if (map.has(goodsId)) {
                 const existing = map.get(goodsId);
                 existing.totalCount += (good.count || 0);
               } else {
                 map.set(goodsId, {
                   name: good.name,
                   standard: good.standard || '',
                   totalCount: good.count || 0
                 });
               }
             });
           }
         });
         // 转换为数组用于展示（按商品 ID 排序）
         this.summaryItems = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
       } else {
         this.summaryItems = [];
       }
     } catch (err) {
       console.error('加载汇总失败', err);
       uni.showToast({ title: '加载汇总失败', icon: 'none' });
     } finally {
       this.summaryLoading = false;
       this.summaryLoaded = true;
     }
   },


    // ========== 定时刷新相关 ==========
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
      // 同时刷新汇总数据
      this.loadSummary();
    },
  }
};
</script>

<style scoped>
	
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;          /* 视口高度，也可用 100% 但需确保父级有高度 */
 
}
.order-list-scroll {
	 flex: 0.92;   
	overflow-y: auto;                   
  /* height: ; */
  background-color: #f5f5f5;
}

/* 汇总卡片样式 */
/* 汇总卡片样式 - 固定高度，超出滚动 */
.summary-card {
	
  background-color: #fff;
  border-radius: 8px;
  margin: 10px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  max-height: 80px;        /* 固定最大高度，可根据需要调整 */
  overflow-y: auto;          /* 内容超出时垂直滚动 */
}
.summary-card::-webkit-scrollbar {
  width: 4px;
}
.summary-card::-webkit-scrollbar-thumb {
  background-color: rgba(0,0,0,0.2);
  border-radius: 2px;
}
.summary-title {
  font-size: 16px;
  font-weight: bold;
  margin-left: 10px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}
.summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #333;
}
.summary-name {
  font-size: 14px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}
.standard{
	
}
.summary-count {
  color: #ff6000;
  font-weight: bold;
}
.summary-empty, .summary-loading {
  text-align: center;
  color: #999;
  padding: 10px;
  font-size: 13px;
}

/* 其余样式与订单列表保持一致 */
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

.order-list { padding: 10px; }
.order-item { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.order-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.order-no { font-size: 12px; color: #999; }
.order-status { font-size: 12px; font-weight: bold; }
.status-0 { color: #ff9800; }
.status-1 { color: #2196f3; }
.status-2 { color: #4caf50; }
.status-3 { color: #999; }
.order-pre { font-size: 12px; font-weight: bold; color: #55aaff; }

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