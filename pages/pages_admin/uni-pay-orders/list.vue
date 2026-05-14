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
            <text class="order-pre">{{ getOrderIsPreText(item.is_pre_order) }}</text>
            <text class="order-no">订单号：{{ item.order_no }}</text>
            <text class="order-status" :class="'status-' + item.status">{{ getStatusText(item) }}</text>
          </view>
          <view class="address-info">
            <text>收货人：{{ item.user_address.user_name}} ;电话：{{ item.user_address.mobile }}</text>
            <text>地址：{{ item.user_address.formatted_address }}</text>
			<text>地址别名：{{ item.user_address.alias || '-' }}</text>
			<text>备注：{{item.remark || "-"}}</text>
			<text>创建时间:{{formatDate(item.create_date)}}<!-- ;修改:{{formatDate(item.update_date)}} --></text>
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
            <!-- 只有未发货才显示打印按钮 -->
              <button 
                v-if="item.status === 0" 
                class="action-btn print" 
                size="mini" 
                @click="printOrder(item)"
              >打印</button>
            <button v-if="item.status === 1" class="action-btn complete" size="mini" @click="confirmComplete(item)">完成</button>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无订单</view>
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
      refreshInterval: 10000, // 30秒刷新一次
	   _printing: false  // 打印操作锁
    };
  },
  computed: {
    whereCondition() {
      const condition = {};
      if (this.statusFilter !== null) {
        condition.status = this.statusFilter;
      }
	   console.log('当前查询条件:', condition); // 调试用
      return condition;
    }
  },
  onLoad(options) {
    if (options.status !== undefined) {
      const status = parseInt(options.status, 10);
      if (status >= 0 && status <= 3) {
        this.statusIndex = status + 1;
        this.statusFilter = status;
      }
    }
    this.$nextTick(() => {
      this.$refs.udb && this.$refs.udb.loadData();
    });
  },
  // 页面显示时启动定时刷新
  onShow() {
    this.startRefreshTimer();
  },
  // 页面隐藏时清除定时器
  onHide() {
    this.clearRefreshTimer();
  },
  // 页面卸载时清除定时器
  onUnload() {
    this.clearRefreshTimer();
  },
  async printOrder(order) {
    // 防重复
    if (this._printing) return
    this._printing = true
  
    uni.showModal({
      // ... 配置不变
      complete: () => {
        // 弹窗关闭后解锁（无论确认还是取消）
        setTimeout(() => {
          this._printing = false
        }, 300)
      }
    })
  },
  methods: {
	  formatDate(timestamp) {
	    if (!timestamp) return '-'
	    const date = new Date(timestamp)
	    const year = date.getFullYear()
	    const month = (date.getMonth() + 1).toString().padStart(2, '0')
	    const day = date.getDate().toString().padStart(2, '0')
	    const hours = date.getHours().toString().padStart(2, '0')
	    const minutes = date.getMinutes().toString().padStart(2, '0')
	    return `${year}-${month}-${day} ${hours}:${minutes}`
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
    getOrderIsPreText(is_pre_order) {
      if (is_pre_order == true) {
        return '预售订单';
      }
    },
    onStatusFilterChange(e) {
       this.statusIndex = Number(e.detail.value); // 转为数字
      // 不立即刷新，等待确认按钮触发
    },
    applyFilter() {
      const value = Number(this.statusIndex); // 确保为数字
      if (value === 0) {
        this.statusFilter = null;
      } else {
        this.statusFilter = value - 1; // 1->0, 2->1, 3->2, 4->3
      }
	   console.log('statusFilter =', this.statusFilter); // 查看是否变为 null
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
        const res = await uniCloud.callFunction({
          name: 'cancelOrder',
          data: { orderId: order._id, cancelType: 'admin' }
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
    async printOrder(order) {
        if (this._printing) return
        this._printing = true
    
        uni.showModal({
          title: '确认发货',
          content: '该订单尚未发货，确认发货并打印？',
          confirmText: '确认发货',
          cancelText: '取消',
          success: async (res) => {
            if (!res.confirm) return
            
            uni.showLoading({ title: '发货中...' })
            try {
              await db.collection('uni-pay-orders').doc(order._id).update({
                status: 1,
                update_date: Date.now(),
                deliver_date: Date.now()
              })
              uni.hideLoading()
              
              uni.navigateTo({
                url: '/pages/pages_admin/uni-pay-orders/print?id=' + order._id
              })
            } catch (err) {
              uni.hideLoading()
              uni.showModal({ 
                content: '发货失败: ' + err.message, 
                showCancel: false 
              })
            }
          },
          complete: () => {
            setTimeout(() => {
              this._printing = false
            }, 300)
          }
        })
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
    },
  }
};
</script>

<style scoped>
.page-container {
	  display: flex;
	  flex-direction: column;
	  height: 100vh;
}
.order-list-scroll {
  flex: 0.92;
  	overflow-y: auto;
  /* height: 100%; */
  background-color: #f5f5f5;
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
.print { background-color: #607d8b; color: #fff; }
.complete { background-color: #9c27b0; color: #fff; }
.error, .loading, .empty { text-align: center; padding: 20px; color: #999; }
</style>
