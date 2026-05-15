<template>
  <view class="dashboard-container">
    <!-- 顶部标题 -->
    <view class="app-dashboard-header app-dashboard-header-gradient">
      <text class="app-dashboard-header-title">管理看板</text>
      <text class="app-dashboard-header-sub">{{ formatDate() }}</text>
    </view>

    <!-- 统计卡片 -->
    <view class="app-stat-row">
      <view class="app-stat-card app-stat-card-pending" @click="goOrders(0)">
        <text class="app-stat-num">{{ stats.pending }}</text>
        <text class="app-stat-label">待处理(去出单)</text>
      </view>
	  <view class="app-stat-card app-stat-card-processing" @click="goOrders(4)">
	    <text class="app-stat-num">{{ stats.processing }}</text>
	    <text class="app-stat-label">已出单(去发货)</text>
	  </view>
      <view class="app-stat-card app-stat-card-shipping" @click="goOrders(1)">
        <text class="app-stat-num">{{ stats.shipping }}</text>
        <text class="app-stat-label">配送中</text>
      </view>
    </view>

    <!-- 库存告警 -->
    <view class="warn-section">
      <view class="app-section-header">
        <text class="app-section-header-title">⚠️ 库存告警 ({{ warnTotal }})</text>
        <text v-if="warnGoods.length > 0" class="app-section-more" @click="goGoodsList">查看全部 ›</text>
      </view>
      <scroll-view class="warn-scroll" scroll-y>
        <view v-if="warnGoods.length === 0" class="app-empty">
          <text>暂无库存告警商品</text>
        </view>
        <view
          v-for="item in warnGoods"
          :key="item._id"
          class="app-warn-card"
          @click="goGoodsDetail(item._id)"
        >
          <image class="app-warn-thumb" :src="getGoodsImage(item)" mode="aspectFill" />
          <view class="app-warn-info">
            <text class="app-warn-name">{{ item.name }}</text>
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
          <button class="app-warn-btn" size="mini" @click.stop="openInbound(item)">入库</button>
        </view>
      </scroll-view>
    </view>

    <!-- 功能入口 -->
    <view class="menu-section">
      <view class="app-menu-grid">
        <view class="app-menu-item" @click="goPage('../uni-pay-orders/list')">
          <view class="app-menu-icon">📦</view>
          <text class="app-menu-label">订单管理</text>
        </view>
        <view class="app-menu-item" @click="goPage('../uni-pay-orders/pre-order-list')">
          <view class="app-menu-icon">📋</view>
          <text class="app-menu-label">预售汇总</text>
        </view>
        <view class="app-menu-item" @click="goPage('../opendb-mall-goods/list')">
          <view class="app-menu-icon">🛒</view>
          <text class="app-menu-label">商品管理</text>
        </view>
        <view class="app-menu-item" @click="goPage('../region-config/edit')">
          <view class="app-menu-icon">🗺️</view>
          <text class="app-menu-label">区域管理</text>
        </view>
        <view class="app-menu-item" @click="goPage('../exchange/list')">
          <view class="app-menu-icon">🎁</view>
          <text class="app-menu-label">兑换物品</text>
        </view>
        <view class="app-menu-item" @click="goPage('../exchange/records')">
          <view class="app-menu-icon">📑</view>
          <text class="app-menu-label">兑换管理</text>
        </view>
      </view>
    </view>
    <!-- 入库弹窗 -->
    <uni-popup ref="inboundPopup" type="center" :mask-click="false">
      <view class="app-popup-form">
        <view class="app-popup-form-header">
          <text class="app-popup-form-title">商品入库</text>
          <text class="app-popup-form-close" @click="closeInbound">×</text>
        </view>
        <view class="app-popup-form-body">
          <view class="popup-goods-name">{{ inboundGoods.name }}</view>
          <view class="app-popup-form-item">
            <text class="app-popup-form-label">数量</text>
            <input class="app-popup-form-input" type="number" v-model="inboundForm.quantity" placeholder="请输入入库数量" />
          </view>
          <view class="app-popup-form-item">
            <text class="app-popup-form-label">生产日期</text>
            <picker mode="date" @change="onInboundDateChange">
              <view class="app-popup-form-picker">{{ inboundForm.production_date || '请选择生产日期' }}</view>
            </picker>
          </view>
          <view class="app-popup-form-item">
            <text class="app-popup-form-label">成本单价(元)</text>
            <input class="app-popup-form-input" type="digit" v-model="inboundForm.unit_cost_yuan" placeholder="可选" />
          </view>
          <view class="app-popup-form-item">
            <text class="app-popup-form-label">批次号</text>
            <input class="app-popup-form-input" v-model="inboundForm.batch_no" placeholder="可选" />
          </view>
          <view class="app-popup-form-item">
            <text class="app-popup-form-label">备注</text>
            <input class="app-popup-form-input" v-model="inboundForm.remark" placeholder="可选" />
          </view>
        </view>
        <view class="app-popup-form-footer">
          <button class="app-popup-form-btn app-popup-form-btn-cancel" size="mini" @click="closeInbound">取消</button>
          <button class="app-popup-form-btn app-popup-form-btn-confirm" size="mini" @click="confirmInbound">确认入库</button>
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
          .limit(500)
          .get();
        this.warnGoods = res.result ? res.result.data : [];
      } catch (err) {
        console.error('加载库存告警失败', err);
        try {
          const fallback = await db.collection('goods')
            .where({ is_on_sale: true })
            .field('sku,name,standard,goods_price,original_price,remain_count,warning_count,goods_thumb')
            .orderBy('remain_count', 'asc')
            .limit(500)
            .get();
          const data = fallback.result ? fallback.result.data : [];
          this.warnGoods = data.filter(item => item.remain_count <= item.warning_count);
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

/* 库存告警区域 */
.warn-section {
  margin-top: 10px;
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.warn-scroll {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 8px;
  padding: 0 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
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
.popup-goods-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 10px;
  font-weight: 500;
}

/* 功能导航 */
.menu-section {
  padding: 8px 12px 12px;
  flex-shrink: 0;
}
</style>
