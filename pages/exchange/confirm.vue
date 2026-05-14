<template>
  <view class="app-container">
    <view v-if="loading" class="app-loading">加载中...</view>
    <view v-else>
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

      <!-- 物品信息 -->
      <view class="app-card-flat goods-section">
        <text class="app-section-title">兑换物品</text>
        <view class="app-goods-item">
          <image class="app-goods-image" :src="goods.image || '/static/tab/goods-default.png'" mode="aspectFill"></image>
          <view class="app-goods-info">
            <text class="app-goods-name">{{ goods.name }}</text>
            <text class="app-goods-standard">规格：{{ goods.standard ||'-'}}</text>
            <text class="app-goods-price-sm">所需积分：{{ formatPrice(goods.points_required, false) }}</text>
            <text class="app-text-grey">库存：{{ goods.stock }}</text>
          </view>
        </view>
      </view>

      <!-- 兑换数量 -->
      <view class="app-card-flat quantity-section">
        <text class="label">兑换数量</text>
        <view class="quantity-control">
          <button class="btn-minus" @click="decreaseQuantity" :disabled="quantity <= 1">-</button>
          <input class="quantity-input" type="number" v-model="quantity" @blur="validateQuantity" />
          <button class="btn-plus" @click="increaseQuantity" :disabled="quantity >= goods.stock">+</button>
        </view>
        <text class="app-text-price">总计所需积分：{{ formatPrice(goods.points_required * quantity, false) }}</text>
      </view>

      <!-- 备注 -->
      <view class="app-card-flat remark-section">
        <textarea v-model="remark" placeholder="选填：备注信息" maxlength="200" />
      </view>

      <!-- 底部按钮 -->
      <view class="app-footer-fixed">
        <view class="total-info">
          <text>合计积分：</text>
          <text class="app-text-price" style="font-size:18px">{{ formatPrice(goods.points_required * quantity, false) }}</text>
        </view>
        <button class="app-btn app-btn-primary" type="primary" @click="submitOrder" :loading="submitting">确认兑换</button>
      </view>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatPrice, formatAddress } from '@/utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      goodsId: '',
      goods: {},
      loading: true,
      selectedAddress: null,
      quantity: 1,
      remark: '',
      submitting: false,
      userScore: 0,
      isAddressManuallySelected: false,
    };
  },
  onLoad(options) {
    this.goodsId = options.goodsId;
    this.loadGoods();
    this.loadUserScore();
  },
  onShow() {
    if (!this.isAddressManuallySelected) {
      this.loadDefaultAddress();
    }
  },
  methods: {
    formatPrice,
    formatAddress,
    async loadGoods() {
      try {
        const res = await db.collection('exchange_goods').doc(this.goodsId).get();
        this.goods = res.result.data[0] || {};
        if (!this.goods._id) {
          uni.showToast({ title: '物品不存在', icon: 'none' });
          setTimeout(() => uni.navigateBack(), 1500);
        }
      } catch (err) {
        console.error(err);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },
    async loadUserScore() {
      const userId = store.userInfo?._id;
      if (!userId) return;
      const res = await db.collection('uni-id-users').doc(userId).field('score').get();
      this.userScore = res.result?.data?.[0]?.score || 0;
    },
    async loadDefaultAddress() {
      const userId = store.userInfo?._id;
      if (!userId) return;
      const res = await db.collection('uni-id-address')
        .where({ user_id: userId, is_default: true })
        .get();
      if (res.result.data.length) {
        this.selectedAddress = res.result.data[0];
      } else {
        const res2 = await db.collection('uni-id-address')
          .where({ user_id: userId })
          .orderBy('create_date', 'desc')
          .get();
        if (res2.result.data.length) this.selectedAddress = res2.result.data[0];
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
    validateQuantity() {
      let qty = parseInt(this.quantity, 10);
      if (isNaN(qty) || qty < 1) qty = 1;
      if (this.goods.stock && qty > this.goods.stock) qty = this.goods.stock;
      this.quantity = qty;
    },
    decreaseQuantity() {
      if (this.quantity > 1) this.quantity--;
    },
    increaseQuantity() {
      if (this.goods.stock && this.quantity < this.goods.stock) this.quantity++;
    },
    async submitOrder() {
      if (!this.selectedAddress) {
        uni.showToast({ title: '请选择收货地址', icon: 'none' });
        return;
      }
      const requiredPoints = this.goods.points_required * this.quantity;
      if (this.userScore < requiredPoints) {
        uni.showToast({ title: '积分不足', icon: 'none' });
        return;
      }
      this.submitting = true;
      uni.showLoading({ title: '提交中...' });
      try {
        const res = await uniCloud.callFunction({
          name: 'createExchangeOrder',
          data: {
            goodsId: this.goodsId,
            userId: store.userInfo._id,
            quantity: this.quantity,
            address: {
              consignee: this.selectedAddress.name,
              mobile: this.selectedAddress.mobile,
              address: this.selectedAddress.formatted_address || this.formatAddress(this.selectedAddress)
            },
            remark: this.remark
          }
        });
        if (res.result.code === 0) {
          uni.showToast({ title: '兑换成功', icon: 'success' });
          setTimeout(() => {
            uni.redirectTo({ url: '../exchange/records' });
          }, 1500);
        } else {
          uni.showModal({ content: res.result.message, showCancel: false });
        }
      } catch (err) {
        console.error(err);
        uni.showToast({ title: '兑换失败', icon: 'none' });
      } finally {
        this.submitting = false;
        uni.hideLoading();
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
.quantity-section { margin-bottom: 10px; }
.quantity-section .label { display: block; margin-bottom: 8px; }
.quantity-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.btn-minus, .btn-plus {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: #007aff;
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  border: none;
  transition: all 0.2s ease;
}
.btn-minus:active, .btn-plus:active {
  background-color: #ddd;
  transform: scale(0.96);
}
.btn-minus:disabled, .btn-plus:disabled {
  opacity: 0.4;
  background-color: #e0e0e0;
  transform: none;
}
.quantity-input {
  width: 60px;
  height: 40px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 6px;
  box-sizing: border-box;
  font-size: 20px;
}
.remark-section textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px;
  box-sizing: border-box;
}
.total-info {
  flex: 1;
  font-size: 16px;
}
</style>