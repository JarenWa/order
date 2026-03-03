<template>
  <view class="order-list-container">
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="uni-pay-orders"
      :where="whereCondition"
      orderby="create_date desc"
    >
      <view v-if="error" class="error">{{ error.message }}</view>
      <view v-else-if="loading" class="loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="order-list">
        <view v-for="item in data" :key="item._id" class="order-item">
          <!-- 点击整个订单进入详情（可选，这里保留点击头部区域跳转） -->
          <view class="order-header" @click="goDetail(item._id)">
			<text class="order-pre">{{ getOrderIsPreText(item.is_pre_order) }}</text>
			  
            <text class="order-no">订单号：{{ item.order_no }}</text>
            <text class="order-status" :class="'status-' + item.status">{{ getStatusText(item.status) }}</text>
          </view>
          <view class="goods-list" @click="goDetail(item._id)">
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
            <text class="total">共 {{ item.goods_list.length }} 件 合计 ¥{{ (item.total_amount / 100).toFixed(2) }}</text>
          </view>

          <!-- 功能按钮组 -->
          <view class="action-buttons">
            <!-- 取消订单（状态0） -->
            <button v-if="item.status === 0" class="action-btn cancel" size="mini" @click="confirmCancel(item._id)">取消</button>
            <!-- 修改订单（状态0） -->
            <button v-if="item.status === 0" class="action-btn edit" size="mini" @click="editOrder(item._id)">修改</button>
            <!-- 确认收货（状态1） -->
            <button v-if="item.status === 1" class="action-btn confirm" size="mini" @click="confirmReceive(item._id)">确认收货</button>
            <!-- 删除订单（状态3） -->
            <button v-if="item.status === 3" class="action-btn delete" size="mini" @click="confirmDelete(item._id)">删除</button>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无订单</view>
    </unicloud-db>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      userInfo: store.userInfo,
      status: null, // 接收从路由传入的状态参数
    };
  },
  computed: {
    // 动态查询条件
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
    getStatusText(status) {
      const map = { 0: '待发货', 1: '配送中', 2: '已收货', 3: '已取消' };
      return map[status] || '未知';
    },
	getOrderIsPreText(is_pre_order) {
		if(is_pre_order ==true){
			return '预售订单';
		}
	 
	},
    goDetail(id) {
      uni.navigateTo({ url: './detail?id=' + id });
    },

    // 取消订单（状态0 -> 状态3）
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
        await db.collection('uni-pay-orders').doc(orderId).update({
          status: 3,
          update_date: Date.now()
        });
        uni.hideLoading();
        uni.showToast({ title: '已取消', icon: 'success' });
        this.$refs.udb.loadData({ clear: true }); // 刷新列表
      } catch (err) {
        uni.hideLoading();
        console.error('取消订单失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      }
    },

    // 修改订单
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
	

    // 确认收货（状态1 -> 状态2，并发放积分）
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
        // 调用云函数，确保积分发放和状态更新原子性
        const res = await uniCloud.callFunction({
          name: 'confirmReceive',
          data: {
            orderId: orderId,
            userId: this.userInfo._id
          }
        });
        if (res.result.code === 0) {
          uni.hideLoading();
          uni.showToast({ title: '确认收货成功', icon: 'success' });
          this.$refs.udb.loadData({ clear: true }); // 刷新列表
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
	

    // 删除订单（状态3）
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
.order-list-container { padding: 10px; background-color: #f5f5f5; min-height: 100vh; }
.order-item { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.order-header { display: flex; justify-content: space-between; margin-bottom: 10px; cursor: pointer; }
.order-no { font-size: 12px; color: #999; }
.order-status { font-size: 12px; font-weight: bold; }
.status-0 { color: #ff9800; }
.status-1 { color: #2196f3; }
.status-2 { color: #4caf50; }
.status-3 { color: #999; }
.order-pre { font-size: 12px; font-weight: bold;color: #55aaff; }

.goods-list { margin-bottom: 8px; cursor: pointer; }
.goods-item { display: flex; margin-bottom: 8px; }
.goods-image { width: 50px; height: 50px; border-radius: 4px; margin-right: 8px; }
.goods-info { flex: 1; }
.goods-name { font-size: 14px; }
.goods-standard { font-size: 12px; color: #999; }
.goods-price { font-size: 12px; color: #ff6000; }
.order-footer { margin-top: 8px; text-align: right; }
.total { font-size: 14px; color: #333; }

/* 按钮样式 */
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