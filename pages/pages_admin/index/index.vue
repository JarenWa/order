<template>
  <view class="dashboard-container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">管理看板</text>
      <text class="header-sub">{{ formatDate() }}</text>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-row">
      <view class="stat-card pending" @click="goOrders(0)">
        <text class="stat-num">{{ stats.pending }}</text>
        <text class="stat-label">待处理(去出单)</text>
      </view>
	  <view class="stat-card processing" @click="goOrders(4)">
	    <text class="stat-num">{{ stats.processing }}</text>
	    <text class="stat-label">已出单(去发货)</text>
	  </view>
      <view class="stat-card shipping" @click="goOrders(1)">
        <text class="stat-num">{{ stats.shipping }}</text>
        <text class="stat-label">配送中</text>
      </view>
    </view>

    <!-- 库存告警 -->
    <view class="warn-section">
      <view class="section-header">
        <text class="section-title">⚠️ 库存告警 ({{ warnTotal }})</text>
        <text v-if="warnGoods.length > 0" class="section-more" @click="goGoodsList">查看全部 ›</text>
      </view>
      <scroll-view class="warn-scroll" scroll-y>
        <view v-if="warnGoods.length === 0" class="warn-empty">
          <text>暂无库存告警商品</text>
        </view>
        <view
          v-for="item in warnGoods"
          :key="item._id"
          class="warn-card"
          @click="goGoodsDetail(item._id)"
        >
          <image class="warn-thumb" :src="getGoodsImage(item)" mode="aspectFill" />
          <view class="warn-info">
            <text class="warn-name">{{ item.name }}</text>
            <text class="warn-sku">{{ item.standard || item.sku || '-' }}</text>
            <view class="warn-price-row">
              <text class="warn-price">¥{{ formatPrice(item.goods_price) }}</text>
              <text v-if="item.original_price && item.original_price > item.goods_price" class="warn-original-price">¥{{ formatPrice(item.original_price) }}</text>
            </view>
            <view class="warn-stock">
              <text class="warn-current">库存 {{ item.remain_count }}</text>
              <text class="warn-threshold">/ 预警 {{ item.warning_count }}</text>
            </view>
          </view>
          <button class="warn-btn" size="mini" @click.stop="openInbound(item)">入库</button>
        </view>
      </scroll-view>
    </view>

    <!-- 功能入口 -->
    <view class="menu-section">
      <view class="menu-grid">
        <view class="menu-item" @click="goPage('../uni-pay-orders/list')">
          <view class="menu-icon">📦</view>
          <text class="menu-label">订单管理</text>
        </view>
        <view class="menu-item" @click="goPage('../uni-pay-orders/pre-order-list')">
          <view class="menu-icon">📋</view>
          <text class="menu-label">预售汇总</text>
        </view>
        <view class="menu-item" @click="goPage('../opendb-mall-goods/list')">
          <view class="menu-icon">🛒</view>
          <text class="menu-label">商品管理</text>
        </view>
        <view class="menu-item" @click="goPage('../opendb-mall-categories/list')">
          <view class="menu-icon">🏷️</view>
          <text class="menu-label">分类管理</text>
        </view>
        <view class="menu-item" @click="goPage('../exchange/list')">
          <view class="menu-icon">🎁</view>
          <text class="menu-label">兑换物品</text>
        </view>
        <view class="menu-item" @click="goPage('../exchange/records')">
          <view class="menu-icon">📑</view>
          <text class="menu-label">兑换管理</text>
        </view>
      </view>
    </view>
    <!-- 入库弹窗 -->
    <uni-popup ref="inboundPopup" type="center" :mask-click="false">
      <view class="inbound-popup">
        <view class="popup-header">
          <text class="popup-title">商品入库</text>
          <text class="popup-close" @click="closeInbound">×</text>
        </view>
        <view class="popup-body">
          <view class="popup-goods-name">{{ inboundGoods.name }}</view>
          <view class="popup-form-item">
            <text class="popup-label">数量</text>
            <input class="popup-input" type="number" v-model="inboundForm.quantity" placeholder="请输入入库数量" />
          </view>
          <view class="popup-form-item">
            <text class="popup-label">生产日期</text>
            <picker mode="date" @change="onInboundDateChange">
              <view class="popup-picker">{{ inboundForm.production_date || '请选择生产日期' }}</view>
            </picker>
          </view>
          <view class="popup-form-item">
            <text class="popup-label">成本单价(元)</text>
            <input class="popup-input" type="digit" v-model="inboundForm.unit_cost_yuan" placeholder="可选" />
          </view>
          <view class="popup-form-item">
            <text class="popup-label">批次号</text>
            <input class="popup-input" v-model="inboundForm.batch_no" placeholder="可选" />
          </view>
          <view class="popup-form-item">
            <text class="popup-label">备注</text>
            <input class="popup-input" v-model="inboundForm.remark" placeholder="可选" />
          </view>
        </view>
        <view class="popup-footer">
          <button class="popup-btn cancel" size="mini" @click="closeInbound">取消</button>
          <button class="popup-btn confirm" size="mini" @click="confirmInbound">确认入库</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { getGoodsImage, formatPrice } from '../../../utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      stats: {
        pending: 0,
		processing: 0,
        shipping: 0
      },
      warnTotal: 0,
      warnGoods: [],
      // 入库弹窗
      inboundVisible: false,
      inboundGoods: {},
      inboundForm: {
        quantity: '',
        production_date: '',
        unit_cost_yuan: '',
        batch_no: '',
        remark: ''
      }
    };
  },
  onLoad() {
    this.loadStats();
    this.loadWarnGoods();
  },
  onShow() {
    this.loadStats();
    this.loadWarnGoods();
  },
  methods: {
    getGoodsImage,
    formatPrice,
    formatDate() {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
      return `${year}年${month}月${day}日 ${week}`;
    },
    async loadStats() {
      try {
        const [pendingRes, shippingRes, processingRes] = await Promise.all([
          db.collection('uni-pay-orders').where({ status: 0 }).count(),
          db.collection('uni-pay-orders').where({ status: 1 }).count(),
		  db.collection('uni-pay-orders').where({ status: 4 }).count()
        ]);
        this.stats.pending = pendingRes.result ? pendingRes.result.total : 0;
        this.stats.shipping = shippingRes.result ? shippingRes.result.total : 0;
		this.stats.processing = processingRes.result ? processingRes.result.total : 0;
      } catch (err) {
        console.error('加载统计数据失败', err);
      }
    },
    async loadWarnGoods() {
      try {
        // 先查总数
        const countRes = await db.collection('goods')
          .where('remain_count <= warning_count')
          .count();
        this.warnTotal = countRes.result ? countRes.result.total : 0;

        const res = await db.collection('goods')
          .where('remain_count <= warning_count')
          .field('sku,name,standard,goods_price,original_price,remain_count,warning_count,goods_thumb')
          .orderBy('remain_count', 'asc')
          .limit(20)
          .get();
        this.warnGoods = res.result ? res.result.data : [];
      } catch (err) {
        console.error('加载库存告警失败', err);
        try {
          const fallback = await db.collection('goods')
            .where({ is_on_sale: true })
            .field('sku,name,standard,goods_price,original_price,remain_count,warning_count,goods_thumb')
            .orderBy('remain_count', 'asc')
            .limit(50)
            .get();
          const data = fallback.result ? fallback.result.data : [];
          this.warnGoods = data.filter(item => item.remain_count <= item.warning_count).slice(0, 20);
          this.warnTotal = this.warnGoods.length;
        } catch (e) {
          this.warnGoods = [];
          this.warnTotal = 0;
        }
      }
    },
    openInbound(item) {
      this.inboundGoods = { ...item };
      this.inboundForm = {
        quantity: '',
        production_date: '',
        unit_cost_yuan: '',
        batch_no: '',
        remark: ''
      };
      this.$refs.inboundPopup && this.$refs.inboundPopup.open();
    },
    closeInbound() {
      this.$refs.inboundPopup && this.$refs.inboundPopup.close();
      this.inboundGoods = {};
    },
    onInboundDateChange(e) {
      this.inboundForm.production_date = e.detail.value;
    },
    async confirmInbound() {
      const quantity = parseInt(this.inboundForm.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        uni.showToast({ title: '请输入有效数量', icon: 'none' });
        return;
      }

      const payload = {
        product_id: this.inboundGoods._id,
        type: 'inbound',
        quantity: quantity,
        remark: this.inboundForm.remark || ''
      };
      if (this.inboundForm.production_date) {
        payload.production_date = this.inboundForm.production_date;
      }
      if (this.inboundForm.unit_cost_yuan) {
        payload.unit_cost = Math.round(parseFloat(this.inboundForm.unit_cost_yuan) * 100);
      }
      if (this.inboundForm.batch_no) {
        payload.batch_no = this.inboundForm.batch_no;
      }

      uni.showLoading({ title: '处理中...', mask: true });
      try {
        const stockCo = uniCloud.importObject('stock-co');
        await stockCo.change(payload);
        uni.showToast({ title: '入库成功', icon: 'success' });
        this.closeInbound();
        this.loadWarnGoods();
      } catch (err) {
        console.error('入库失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      } finally {
        uni.hideLoading();
      }
    },
    goOrders(status) {
      uni.navigateTo({
        url: `../uni-pay-orders/list?status=${status}`
      });
    },
    goGoodsList() {
      uni.navigateTo({ url: '../opendb-mall-goods/list' });
    },
    goGoodsDetail(id) {
      uni.navigateTo({ url: '../opendb-mall-goods/detail?id=' + id });
    },
    goPage(url) {
      uni.navigateTo({ url });
    }
  }
};
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f6fa;
  overflow: hidden;
}

/* 顶部标题 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px 16px 24px;
  color: #fff;
  flex-shrink: 0;
}
.header-title {
  font-size: 18px;
  font-weight: bold;
  display: block;
}
.header-sub {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
  display: block;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 10px;
  padding: 0 12px;
  margin-top: -14px;
  flex-shrink: 0;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.stat-card.pending {
  border-top: 3px solid #ff9800;
}
.stat-card.shipping {
  border-top: 3px solid #4caf50;
}
.stat-num {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  display: block;
}
.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  display: block;
}

/* 库存告警区域 */
.warn-section {
  margin-top: 10px;
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.section-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}
.section-more {
  font-size: 12px;
  color: #667eea;
}
.warn-scroll {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 8px;
  padding: 0 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.warn-empty {
  padding: 20px 0;
  text-align: center;
  color: #999;
  font-size: 13px;
}
.warn-card {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.warn-card:last-child {
  border-bottom: none;
}
.warn-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background-color: #f0f0f0;
  flex-shrink: 0;
  margin-right: 8px;
}
.warn-info {
  flex: 1;
  overflow: hidden;
}
.warn-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.warn-sku {
  font-size: 11px;
  color: #999;
  display: block;
}
.warn-stock {
  margin-top: 2px;
}
.warn-current {
  font-size: 12px;
  color: #f44336;
  font-weight: bold;
}
.warn-threshold {
  font-size: 11px;
  color: #999;
}
.warn-price-row {
  margin-top: 2px;
}
.warn-price {
  font-size: 12px;
  color: #ff6000;
  font-weight: bold;
}
.warn-original-price {
  font-size: 11px;
  color: #999;
  text-decoration: line-through;
  margin-left: 4px;
}
.warn-btn {
  margin: 0;
  margin-left: 6px;
  padding: 2px 10px;
  font-size: 11px;
  line-height: 20px;
  height: 26px;
  background-color: #4caf50;
  color: #fff;
  border: none;
  border-radius: 4px;
}

/* 入库弹窗 */
.inbound-popup {
  width: 300px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.popup-title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
}
.popup-close {
  font-size: 20px;
  color: #999;
  padding: 0 4px;
}
.popup-body {
  padding: 12px 16px;
}
.popup-goods-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 10px;
  font-weight: 500;
}
.popup-form-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.popup-label {
  width: 90px;
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}
.popup-input {
  flex: 1;
  height: 34px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 13px;
}
.popup-picker {
  flex: 1;
  height: 34px;
  line-height: 34px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 13px;
  color: #333;
}
.popup-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 10px 16px 14px;
  border-top: 1px solid #eee;
}
.popup-btn {
  margin: 0;
  padding: 4px 14px;
  font-size: 13px;
  border-radius: 4px;
}
.popup-btn.cancel {
  background-color: #f5f5f5;
  color: #666;
  border: none;
}
.popup-btn.confirm {
  background-color: #4caf50;
  color: #fff;
  border: none;
}

/* 功能导航 */
.menu-section {
  padding: 8px 12px 12px;
  flex-shrink: 0;
}
.menu-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.menu-item {
  width: calc(30% - 5.33px);
  background: #fff;
  border-radius: 8px;
  padding: 10px 4px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.menu-icon {
  font-size: 22px;
  margin-bottom: 4px;
}
.menu-label {
  font-size: 12px;
  color: #333;
}
</style>
