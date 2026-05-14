<template>
  <view class="app-container app-pb-70">
    <!-- 地址选择 -->
    <view class="app-card-flat address-section" @click="selectAddress">
      <view v-if="selectedAddress" class="app-address-info">
        <text class="app-address-name">{{ selectedAddress.name }}</text>
        <text class="app-address-mobile">{{ selectedAddress.mobile }}</text>
        <text class="app-address-detail">{{ selectedAddress.formatted_address || formatAddress(selectedAddress) }}</text>
      </view>
      <view v-else class="address-empty">请选择收货地址</view>
      <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
    </view>

    <!-- 商品列表 -->
    <view class="app-card-flat goods-section">
      <text class="app-section-title">商品清单</text>
      <view v-if="isPreOrder && preOrderItem" class="app-goods-item">
        <image class="app-goods-image-sm" :src="getGoodsImage(preOrderItem.good)" mode="aspectFill"></image>
        <view class="app-goods-info">
          <text class="app-goods-name">{{ preOrderItem.good.name }}</text>
          <text class="app-goods-standard">{{ preOrderItem.good.standard || '' }}</text>
          <text class="app-goods-price-sm">¥{{ formatPrice(preOrderItem.good.goods_price) }} x {{ preOrderItem.count }}</text>
        </view>
        <text class="app-text-price">¥{{ formatPrice(preOrderItem.good.goods_price * preOrderItem.count) }}</text>
      </view>
      <block v-else>
        <view v-for="item in selectedItems" :key="item._id" class="app-goods-item">
          <image class="app-goods-image-sm" :src="getGoodsImage(item)" mode="aspectFill"></image>
          <view class="app-goods-info">
            <text class="app-goods-name">{{ item.goodsInfo?.name }}</text>
            <text class="app-goods-standard">{{ item.goodsInfo?.standard || '' }}</text>
            <text class="app-goods-price-sm">¥{{ formatPrice(item.goodsInfo?.goods_price) }} x {{ item.good_count }}</text>
          </view>
          <text class="app-text-price">¥{{ formatPrice(item.goodsInfo?.goods_price * item.good_count) }}</text>
        </view>
      </block>
    </view>

    <!-- 备注 -->
    <view class="app-card-flat remark-section">
      <textarea v-model="remark" placeholder="选填：备注信息" maxlength="200" />
    </view>

    <!-- 底部 -->
    <view class="app-footer-fixed">
      <view class="total">
        参考总价：<text class="app-text-price" style="font-size:18px">¥{{ totalAmount.toFixed(2) }}</text> （以实际单据为准）
      </view>
      <view class="score">
        可得积分：{{ formatPrice(scoreEarned) }}
      </view>
      <button class="app-btn app-btn-primary" type="primary" @click="submitOrder" :loading="submitting">提交预定</button>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatPrice, formatAddress, calcScore, getGoodsImage } from '@/utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      selectedItems: [],
      preOrderItem: null,
      isPreOrder: false,
      selectedAddress: null,
      remark: '',
      submitting: false,
      totalAmount: 0,
      scoreEarned: 0,
      isAddressManuallySelected: false,
    };
  },
  onLoad(options) {
    if (options && options.type === 'pre') {
      this.isPreOrder = true;
      const preItem = uni.getStorageSync('preOrderItem');
      if (preItem && preItem.good) {
        this.preOrderItem = preItem;
        const total = preItem.good.goods_price * preItem.count;
        this.totalAmount = total / 100;
        this.scoreEarned = calcScore(total);
        uni.removeStorageSync('preOrderItem');
      } else {
        uni.showToast({ title: '预售商品信息丢失', icon: 'none' });
        setTimeout(() => uni.navigateBack(), 1500);
      }
    } else {
      const items = uni.getStorageSync('selectedCartItems');
      if (!items || items.length === 0) {
        uni.showToast({ title: '请先选择商品', icon: 'none' });
        setTimeout(() => uni.navigateBack(), 1500);
        return;
      }
      this.selectedItems = items;
      this.calcTotal();
    }
  },
  onShow() {
    if (!this.isAddressManuallySelected) {
      this.loadDefaultAddress();
    }
  },
  methods: {
    formatPrice,
    formatAddress,
    getGoodsImage,
    calcTotal() {
      let total = 0;
      this.selectedItems.forEach(item => {
        if (item.goodsInfo) {
          total += item.goodsInfo.goods_price * item.good_count;
        }
      });
      this.totalAmount = total / 100;
      this.scoreEarned = calcScore(total);
    },
    async loadDefaultAddress() {
      if (!store.userInfo || !store.userInfo._id) return;
      const res = await db.collection('uni-id-address')
        .where({ user_id: store.userInfo._id, is_default: true })
        .get();
      if (res.result.data.length > 0) {
        this.selectedAddress = res.result.data[0];
      } else {
        const res2 = await db.collection('uni-id-address')
          .where({ user_id: store.userInfo._id })
          .orderBy('create_date', 'desc')
          .get();
        if (res2.result.data.length > 0) {
          this.selectedAddress = res2.result.data[0];
        } else {
          this.selectedAddress = null;
        }
      }
    },
    selectAddress() {
      uni.navigateTo({
        url: '/pages/address/select?selectMode=true',
        events: {
          onSelectAddress: (addr) => {
            this.selectedAddress = addr;
            this.isAddressManuallySelected = true;
          }
        }
      });
    },
    async submitOrder() {
      if (!this.selectedAddress) {
        uni.showToast({ title: '请选择收货地址', icon: 'none' });
        return;
      }
      this.submitting = true;
      uni.showLoading({ title: '提交中...', mask: true });

      let selectedItems = [];
      if (this.isPreOrder && this.preOrderItem) {
        selectedItems = [{
          good_id: this.preOrderItem.good._id,
          good_count: this.preOrderItem.count,
          goodsInfo: this.preOrderItem.good
        }];
      } else {
        selectedItems = this.selectedItems;
      }

      try {
        const res = await uniCloud.callFunction({
          name: 'createOrder',
          data: {
            userId: store.userInfo._id,
            addressId: this.selectedAddress._id,
            selectedItems: selectedItems,
            remark: this.remark,
            isPreOrder: this.isPreOrder
          }
        });

        if (res.result.code === 0) {
          uni.hideLoading();
          uni.showToast({ title: '订单提交成功', icon: 'success' });
          uni.$emit('cartUpdated');
          if (!this.isPreOrder) {
            uni.removeStorageSync('selectedCartItems');
          }
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/order/list' });
          }, 1500);
        } else {
          uni.hideLoading();
          uni.showModal({ content: res.result.message, showCancel: false });
        }
      } catch (err) {
        uni.hideLoading();
        console.error('下单失败', err);
        uni.showModal({ content: err.message || '下单失败，请重试', showCancel: false });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped>
.address-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.address-empty { color: #999; }
.goods-section { margin-bottom: 10px; }
.remark-section textarea {
  width: 100%;
  min-height: 60px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
  box-sizing: border-box;
}
.total {
  flex: 1;
  font-size: 14px;
}
.score {
  margin-right: 10px;
  color: #666;
}
</style>