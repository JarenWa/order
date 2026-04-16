<template>
  <view class="confirm-container">
    <!-- 地址选择 -->
    <view class="address-section">
      <view v-if="selectedAddress" class="address-info" @click="selectAddress">
        <text class="name">{{ selectedAddress.name }}</text>
        <text class="mobile">{{ selectedAddress.mobile }}</text>
        <text class="address">{{ selectedAddress.formatted_address || formatAddress(selectedAddress) }}</text>
      </view>
      <view v-else class="address-empty" @click="addAddress">
        请新增收货地址
      </view>
      <uni-icons type="arrowright" size="18" color="#999"></uni-icons>
    </view>

    <!-- 商品列表 -->
    <view class="goods-section">
      <view class="section-title">商品清单</view>
      <!-- 预售商品显示（单个） -->
      <view v-if="isPreOrder && preOrderItem" class="goods-item">
        <image class="goods-image" :src="getGoodsImage(preOrderItem.good)" mode="aspectFill"></image>
        <view class="goods-info">
          <text class="goods-name">{{ preOrderItem.good.name }}</text>
          <text class="goods-standard">{{ preOrderItem.good.standard || '' }}</text>
          <text class="goods-price">¥{{ (preOrderItem.good.goods_price / 100).toFixed(2) }} x {{ preOrderItem.count }}</text>
        </view>
        <text class="goods-total">¥{{ (preOrderItem.good.goods_price * preOrderItem.count / 100).toFixed(2) }}</text>
      </view>
      <!-- 普通购物车商品显示（多个） -->
      <block v-else>
        <view v-for="item in selectedItems" :key="item._id" class="goods-item">
          <image class="goods-image" :src="getGoodsImage(item)" mode="aspectFill"></image>
          <view class="goods-info">
            <text class="goods-name">{{ item.goodsInfo?.name }}</text>
            <text class="goods-standard">{{ item.goodsInfo?.standard || '' }}</text>
            <text class="goods-price">¥{{ (item.goodsInfo?.goods_price / 100).toFixed(2) }} x {{ item.good_count }}</text>
          </view>
          <text class="goods-total">¥{{ (item.goodsInfo?.goods_price * item.good_count / 100).toFixed(2) }}</text>
        </view>
      </block>
    </view>

    <!-- 备注 -->
    <view class="remark-section">
      <textarea v-model="remark" placeholder="选填：备注信息" maxlength="200" />
    </view>

    <!-- 底部 -->
    <view class="footer">
      <view class="total">
        合计：<text class="price">¥{{ totalAmount.toFixed(2) }}</text>
      </view>
      <view class="score">
        可得积分：{{ (scoreEarned / 100).toFixed(2) }}
      </view>
      <button class="submit-btn" type="primary" @click="submitOrder" :loading="submitting">提交订单</button>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();
const dbCmd = db.command;

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
    console.log('confirm onLoad options:', options);
    console.log('preOrderItem cache:', uni.getStorageSync('preOrderItem'));

    if (options && options.type === 'pre') {
      // 预售订单
      this.isPreOrder = true;
      const preItem = uni.getStorageSync('preOrderItem');
      if (preItem && preItem.good) {
        this.preOrderItem = preItem;
        const total = preItem.good.goods_price * preItem.count;
        this.totalAmount = total / 100;
        this.scoreEarned = Math.ceil(total / 100);
        // 清除缓存，避免重复使用
        uni.removeStorageSync('preOrderItem');
      } else {
        uni.showToast({ title: '预售商品信息丢失', icon: 'none' });
        setTimeout(() => uni.navigateBack(), 1500);
      }
    } else {
      // 普通订单
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
    calcTotal() {
      let total = 0;
      this.selectedItems.forEach(item => {
        if (item.goodsInfo) {
          total += item.goodsInfo.goods_price * item.good_count;
        }
      });
      this.totalAmount = total / 100;
      this.scoreEarned = Math.ceil(total / 100);
    },
    getGoodsImage(item) {
      const info = item.goodsInfo || item.good;
      if (!info) return '/static/tab/goods-default.png';
      if (info.goods_swiper_imgs && info.goods_swiper_imgs.length) {
        const first = info.goods_swiper_imgs[0];
        return first.url || first.fileID || '/static/tab/goods-default.png';
      }
      return info.goods_thumb || '/static/tab/goods-default.png';
    },
    formatAddress(addr) {
      return [addr.province_name, addr.city_name, addr.district_name, addr.street_name, addr.address].filter(v => v).join(' ');
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
    addAddress() {
      uni.navigateTo({
        url: '../address/add',
        events: {
          refreshData: () => {
            this.isAddressManuallySelected = false;
            this.loadDefaultAddress();
          }
        }
      });
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

      // 构造商品列表
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
		  // 通知购物车页面刷新
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
.confirm-container { padding: 10px; background-color: #f5f5f5; min-height: 100vh; }
.address-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
.address-info { flex: 1; display: flex; flex-direction: column; }
.name { font-weight: bold; }
.mobile { color: #666; margin-left: 10px; }
.address { font-size: 14px; color: #999; margin-top: 5px; }
.address-empty { color: #999; }
.goods-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.section-title { font-weight: bold; margin-bottom: 10px; }
.goods-item { display: flex; align-items: center; margin-bottom: 10px; }
.goods-image { width: 60px; height: 60px; border-radius: 6px; margin-right: 10px; }
.goods-info { flex: 1; }
.goods-name { font-size: 14px; }
.goods-standard { font-size: 12px; color: #999; }
.goods-price { font-size: 14px; color: #ff6000; }
.goods-total { font-weight: bold; }
.remark-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
textarea { width: 100%; min-height: 60px; border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
.footer { position: fixed; bottom: 0; left: 0; right: 0; background-color: #fff; padding: 10px; display: flex; align-items: center; box-shadow: 0 -2px 4px rgba(0,0,0,0.05); }
.total { flex: 1; font-size: 14px; }
.price { font-size: 18px; color: #ff6000; font-weight: bold; margin-left: 5px; }
.score { margin-right: 10px; color: #666; }
.submit-btn { width: 120px; height: 40px; line-height: 40px; border-radius: 20px; }
</style>