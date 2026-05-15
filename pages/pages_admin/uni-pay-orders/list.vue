<template>
	<view class="page-container">
	<!-- 顶部筛选行 -->
	<view class="app-admin-toolbar">
	  <view class="filter-menu">
	    <picker @change="onStatusFilterChange" :value="statusIndex" :range="statusOptions">
	      <view class="app-admin-picker">
	        {{ statusOptions[statusIndex] }}
	        <text class="uni-icon app-admin-picker-arrow">▼</text>
	      </view>
	    </picker>
	  </view>
	  <view class="filter-menu">
	    <picker @change="onStreetFilterChange" :value="streetIndex" :range="streetOptions">
	      <view class="app-admin-picker">
	        {{ streetOptions[streetIndex] }}
	        <text class="uni-icon app-admin-picker-arrow">▼</text>
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
      <view v-if="error" class="app-error">{{ error.message }}</view>
      <view v-else-if="loading" class="app-loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="order-list">
        <view v-for="item in data" :key="item._id" class="app-order-card">
          <view class="app-order-header">
            <text class="app-order-pre">{{ getOrderIsPreText(item.is_pre_order) }}</text>
            <text class="app-order-no">订单号：{{ item.order_no }}</text>
            <text class="app-status-tag" :class="'app-status-' + item.status">{{ getStatusText(item) }}</text>
          </view>
          <view class="app-order-address">
            <text>收货人：{{ item.user_address.user_name}} ;电话：{{ item.user_address.mobile }}</text>
            <text>地址：{{ item.user_address.formatted_address }}</text>
            <text>地址别名：{{ item.user_address.alias || '-' }}</text>
            <text>备注：{{item.remark || "-"}}</text>
            <text>创建时间:{{formatDate(item.create_date)}}</text>
          </view>
          <view class="goods-list">
            <view v-for="(good, index) in item.goods_list" :key="index" class="goods-item">
              <view class="goods-info">
                <text class="app-goods-name">{{ good.name }}</text>
                <text class="app-goods-standard">{{ good.standard }}</text>
                <text class="app-goods-price-sm">¥{{ formatPrice(good.price)}} x {{ good.count }}</text>
              </view>
            </view>
          </view>
          <view class="app-order-footer">
            <text class="total">合计：¥{{ formatPrice(item.total_amount)}}</text>
            <text class="score">积分：{{ formatPrice(item.score_earned) }}</text>
          </view>
          <view class="app-order-actions">
            <button v-if="item.status === 0" class="app-action-btn app-action-btn-pdf" size="mini" @click="createOrderPdf(item._id)">出单</button>
            <button v-if="item.status === 0" class="app-action-btn app-action-btn-edit" size="mini" @click="editOrder(item._id)">修改</button>
            <button v-if="item.status === 0 || item.status === 1|| item.status === 4" class="app-action-btn app-action-btn-cancel" size="mini" @click="confirmCancel(item)">取消</button>
            <button v-if="item.status === 4" class="app-action-btn app-action-btn-ship" size="mini" @click="confirmShip(item)">发货</button>
            <button v-if="item.pdf_file_url && item.status === 4" class="app-action-btn app-action-btn-print" size="mini" @click="printOrderPdf(item.pdf_file_url)">打印</button>
            <button v-if="item.status === 1" class="app-action-btn app-action-btn-complete" size="mini" @click="confirmComplete(item)">完成</button>
          </view>
        </view>
      </view>
      <view v-else class="app-empty">暂无订单</view>
      <uni-load-more :status="loading ? 'loading' : (hasMore ? 'more' : 'noMore')" />
    </unicloud-db>
  </scroll-view>
  </view>
</template>

<script>
const db = uniCloud.database();
import { formatDate, formatPrice, getOrderStatusText } from '@/utils/common.js';

export default {
  data() {
    return {
		refreshKey: 0,
      refreshing: false,
      statusFilter: null, // null 表示全部，0,1,2,3 分别对应各状态
      statusOptions: ['全部订单', '待处理', '配送中', '已收货', '已取消', '已出单'],
      statusIndex: 0,
      // 地区筛选
      regionStatic: { provinces: [], cities: {}, districts: {}, streets: {} },
      streetFilter: null,
      streetIndex: 0,
      streetOptions: ['全部地区'],
      allStreets: [],
      // 定时刷新相关
      refreshTimer: null,
      refreshInterval: 10000, // 30秒刷新一次
	   _printing: false  // 打印操作锁
    };
  },
  computed: {
    whereCondition() {
      const conditions = [];
      if (this.statusFilter !== null) {
        conditions.push(`status == ${this.statusFilter}`);
      }
      if (this.streetFilter) {
        conditions.push(`user_address.street_code == "${this.streetFilter}"`);
      }
      console.log('当前查询条件:', conditions);
      if (conditions.length === 0) return '';
      return conditions.join(' && ');
    }
  },
  onLoad(options) {
    this.loadRegionConfig();
    if (options.status !== undefined) {
      const status = parseInt(options.status, 10);
      if (status >= 0 && status <= 4) {
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
    //this.startRefreshTimer();
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
	  formatDate,
	  formatPrice,
	async printOrderPdf(url) {
		uni.showLoading({ title: '下载中...' });
		uni.downloadFile({
		  url: url,
		  success: (downloadRes) => {
		    uni.hideLoading();
		    uni.openDocument({
		      filePath: downloadRes.tempFilePath,
		      fileType: 'pdf',
		      showMenu: true
		    });
		  },
		  fail: (err) => {
		    uni.hideLoading();
		    console.error('下载单据失败', err);
		  }
		});
		
	},
	  
	  // ========== 生成 PDF ==========
	async createOrderPdf(orderId) {
	  uni.showModal({
	    title: '确认出单（生成单据）',
	    content: '若生成单据，订单状态将从【待处理】转为【已出单】',    // 0——>4
	    confirmText: '确认',
	    cancelText: '取消',
	    success: async (res) => {
	      if (!res.confirm) return;
	
	      uni.showLoading({ title: '生成单据中...', mask: true });
	      try {
	        const cloudRes = await uniCloud.callFunction({
	          name: 'generateOrderPdf',
	          data: { orderId: orderId }
	        });
	
	        if (cloudRes.result.code !== 0) {
	          throw new Error(cloudRes.result.message || '生成单据失败');
	        }
	
	        // 生成成功，更新订单状态为已出单（4）
	        await db.collection('uni-pay-orders').doc(orderId).update({
	          status: 4,
	          update_date: Date.now()
	        });
	
	        uni.hideLoading();
	        uni.showToast({ 
	          title: '单据已生成', 
	          icon: 'success',
	          complete: () => {
	          }
	        });
	
	      } catch (err) {
	        uni.hideLoading();
	        console.error('生成单据失败', err);
	        uni.showToast({ title: err.message || '生成单据失败', icon: 'none' });
	      }
	    }
	  });
	},
	
	getStatusText(item) {
	  return getOrderStatusText(item.status, {
	    admin_cancelled: item.admin_cancelled,
	    admin_completed: item.admin_completed,
	    admin_modified: item.admin_modified
	  });
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
    onStreetFilterChange(e) {
      this.streetIndex = Number(e.detail.value);
    },
    async loadRegionConfig() {
      let config = uni.getStorageSync('regionConfig');
      try {
        const res = await db.collection('app-region-config').limit(1).get();
        if (res.result.data && res.result.data.length > 0) {
          const data = res.result.data[0];
          config = {
            provinces: data.provinces || [],
            cities: data.cities || {},
            districts: data.districts || {},
            streets: data.streets || {}
          };
          uni.setStorageSync('regionConfig', config);
        }
      } catch (err) {
        console.error('加载区域配置失败', err);
      }
      if (config && config.streets) {
        this.regionStatic = config;
        const allStreets = [];
        Object.values(config.streets).forEach(list => {
          if (Array.isArray(list)) allStreets.push(...list);
        });
        this.allStreets = allStreets;
        this.streetOptions = ['全部地区', ...allStreets.map(s => s.name)];
      }
    },
    applyFilter() {
      const value = Number(this.statusIndex); // 确保为数字
      if (value === 0) {
        this.statusFilter = null;
      } else {
        this.statusFilter = value - 1; // 1->0, 2->1, 3->2, 4->3
      }
      const streetValue = Number(this.streetIndex);
      if (streetValue === 0) {
        this.streetFilter = null;
      } else {
        this.streetFilter = this.allStreets[streetValue - 1] ? this.allStreets[streetValue - 1].code : null;
      }
      console.log('statusFilter =', this.statusFilter, 'streetFilter =', this.streetFilter);
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
	
	confirmShip(order){
		uni.showModal({
		  title: '提示',
		  content: '发货前请确认已经打印了订单',
		  cancelText: '返回打印',
		  confirmText: '确认发货',
		  success: (res) => {
		    if (res.confirm) {
		      this.shipOrder(order);
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
	

    
    Ship(order) {
      uni.showModal({
        title: '确认单据是否打印',
        content: '发货前先打印单据',
        confirmText: '已打印，去发货',  //超出显示范围导致无弹窗
		cancelText: '去打印',
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
        uni.showToast({ title: '配送中', icon: 'success' });
        this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        uni.hideLoading();
        console.error('出货失败', err);
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
    // startRefreshTimer() {
    //   if (this.refreshTimer) clearInterval(this.refreshTimer);
    //   this.refreshTimer = setInterval(() => {
    //     this.refreshData();
    //   }, this.refreshInterval);
    // },
    clearRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },
    // refreshData() {
    //   if (this.$refs.udb) {
    //     this.$refs.udb.loadData({ clear: true });
    //   }
    // },
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
  flex: 1;
  	overflow-y: auto;
  /* height: 100%; */
  background-color: #f5f5f5;
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
.order-list { padding: 10px; }
.goods-list { margin-bottom: 8px; }
.goods-item { display: flex; margin-bottom: 8px; }
.goods-info { flex: 1; }
.goods-name { font-size: 14px; }
.goods-standard { font-size: 12px; color: #999; }
.goods-price { font-size: 12px; color: #ff6000; }
.total { color: #333; }
.score { color: #666; }
</style>
