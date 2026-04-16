<template>
  <view class="confirm-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else>
      <!-- 地址选择 -->
      <view class="address-section">
        <view v-if="selectedAddress" class="address-info" @click="selectAddress">
          <text class="name">{{ selectedAddress.name }}</text>
          <text class="mobile">{{ selectedAddress.mobile }}</text>
          <text class="address">{{ selectedAddress.formatted_address || formatAddress(selectedAddress) }}</text>
        </view>
        <view v-else class="address-empty">请选择收货地址</view>
        <uni-icons type="arrowright" size="18" color="#999"></uni-icons>
      </view>

      <!-- 物品信息 -->
      <view class="goods-section">
        <view class="section-title">兑换物品</view>
        <view class="goods-card">
          <image class="goods-image" :src="goods.image || '/static/tab/goods-default.png'" mode="aspectFill"></image>
          <view class="goods-info">
            <text class="name">{{ goods.name }}</text>
			 <text class="standard">规格：{{ goods.standard ||'-'}}</text>
            <text class="points">所需积分：{{ (goods.points_required / 100).toFixed(2) }} </text>
            <text class="stock">库存：{{ goods.stock }}</text>
          </view>
        </view>
      </view>

      <!-- 兑换数量 -->
      <view class="quantity-section">
        <text class="label">兑换数量</text>
        <view class="quantity-control">
          <button class="btn-minus" @click="decreaseQuantity" :disabled="quantity <= 1">-</button>
          <input class="quantity-input" type="number" v-model="quantity" @blur="validateQuantity" />
          <button class="btn-plus" @click="increaseQuantity" :disabled="quantity >= goods.stock">+</button>
        </view>
        <text class="total-points">总计所需积分：{{ (goods.points_required * quantity / 100).toFixed(2) }}</text>
      </view>
	  

      <!-- 备注 -->
      <view class="remark-section">
        <textarea v-model="remark" placeholder="选填：备注信息" maxlength="200" />
      </view>

      <!-- 底部按钮 -->
      <view class="footer">
        <view class="total-info">
          <text>合计积分：</text>
          <text class="total-points-value">{{ (goods.points_required * quantity / 100).toFixed(2) }}</text>
        </view>
        <button class="submit-btn" type="primary" @click="submitOrder" :loading="submitting">确认兑换</button>
      </view>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();

export default {
  data() {
    return {
      goodsId: '',
      goods: null,
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
    async loadGoods() {
      try {
        const res = await db.collection('exchange_goods').doc(this.goodsId).get();
        this.goods = res.result.data[0];
        if (!this.goods) {
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
      const userData = res.result?.data?.[0];
      this.userScore = userData?.score || 0;
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
    formatAddress(addr) {
      return [addr.province_name, addr.city_name, addr.district_name, addr.street_name, addr.address].filter(v => v).join(' ');
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
      if (this.goods && qty > this.goods.stock) qty = this.goods.stock;
      this.quantity = qty;
    },
    decreaseQuantity() {
      if (this.quantity > 1) this.quantity--;
    },
    increaseQuantity() {
      if (this.goods && this.quantity < this.goods.stock) this.quantity++;
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
.confirm-container { padding: 10px; background-color: #f5f5f5; min-height: 100vh; }
.address-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
.address-info { flex: 1; display: flex; flex-direction: column; }
.name { font-weight: bold; }
.mobile { color: #666; margin-left: 8px; }
.address { font-size: 14px; color: #999; margin-top: 5px; }
.address-empty { color: #999; }
.goods-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.section-title { font-weight: bold; margin-bottom: 10px; }
.goods-card { display: flex; align-items: center; }
.goods-image { width: 80px; height: 80px; border-radius: 8px; margin-right: 12px; }
.goods-info { flex: 1;  display: flex; flex-direction: column;}
.name { font-size: 16px; font-weight: bold; }
.points { color: #ff6000; margin: 4px 0; }
.stock { font-size: 12px; color: #999; }
.quantity-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.label { display: block; margin-bottom: 8px; }
.quantity-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-minus, .btn-plus {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  /* background-color: #f0f0f0; */
  background-color:#007aff;
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

.total-points {
  margin-top: 14px;
  color: #ff6000;
  font-size: 16px;
}
.remark-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
textarea { width: 100%; min-height: 80px; border: 1px solid #ddd; border-radius: 8px; padding: 8px; }
.footer { position: fixed; bottom: 0; left: 0; right: 0; background-color: #fff; padding: 10px; display: flex; align-items: center; box-shadow: 0 -2px 4px rgba(0,0,0,0.05); }
.total-info { flex: 1; font-size: 16px; }
.total-points-value { color: #ff6000; font-weight: bold; font-size: 18px; }
.submit-btn { width: 120px; height: 40px; line-height: 40px; border-radius: 20px; }
</style>