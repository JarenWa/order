<template>
  <view class="app-container">
    <!-- 预售商品区域 -->
    <view class="goods-section app-card-flat">
      <view class="app-section-header-bar">
        <text class="app-section-header-text">预售专区</text>
        <text class="app-section-header-sub">非现货，按期配送</text>
      </view>
      <view class="app-goods-grid">
        <block v-for="item in preGoods" :key="item._id">
          <view class="app-goods-grid-item app-product-card" @click="goGoodsDetail(item._id)">
            <image class="app-product-image" :src="getGoodsImage(item)" mode="aspectFill" @error="onImageError(item)"></image>
            <view class="app-product-info">
              <text class="app-product-name">{{ item.name }}</text>
              <text class="app-product-meta">{{ item.standard }}</text>
              <text v-if="item.goods_desc" class="app-product-meta" style="color: #55aaff;">{{ item.goods_desc }}</text>
              <text v-if="item.goods_remark" class="app-product-meta">{{ item.goods_remark }}</text>
              <text v-if="item.current_production_date" class="app-product-meta">生产日期: {{ item.current_production_date }}</text>
              <view class="app-product-price-row">
                <text class="app-product-price">¥{{ formatPrice(item.goods_price) }}</text>
                <text v-if="item.original_price && item.original_price > item.goods_price" class="app-product-original-price">¥{{ formatPrice(item.original_price) }}</text>
              </view>
            </view>
            <view class="app-cart-btn" @click.stop="showPreOrder(item)">
              <uni-icons type="plusempty" size="18" color="#ffffff"></uni-icons>
            </view>
          </view>
        </block>
      </view>
      <uni-load-more v-if="preLoading" status="loading" />
    </view>

    <!-- 新品商品区域 -->
    <view class="goods-section app-card-flat">
      <view class="app-section-header-bar">
        <text class="app-section-header-text">现货新品</text>
        <text class="app-section-header-sub">新鲜上架</text>
      </view>
      <view class="app-goods-grid">
        <block v-for="item in newGoods" :key="item._id">
          <view class="app-goods-grid-item app-product-card" @click="goGoodsDetail(item._id)">
            <image class="app-product-image" :src="getGoodsImage(item)" mode="aspectFill" @error="onImageError(item)"></image>
            <view class="app-product-info">
              <text class="app-product-name">{{ item.name }}</text>
              <text class="app-product-meta">{{ item.standard }}</text>
              <text v-if="item.goods_remark" class="app-product-meta">{{ item.goods_remark }}</text>
              <text v-if="item.current_production_date" class="app-product-meta">生产日期: {{ item.current_production_date }}</text>
              <view class="app-product-price-row">
                <text class="app-product-price">¥{{ formatPrice(item.goods_price) }}</text>
                <text v-if="item.original_price && item.original_price > item.goods_price" class="app-product-original-price">¥{{ formatPrice(item.original_price) }}</text>
              </view>
            </view>
            <view class="app-cart-btn" @click.stop="showAddToCart(item)">
              <uni-icons type="plusempty" size="18" color="#ffffff"></uni-icons>
            </view>
          </view>
        </block>
      </view>
      <uni-load-more v-if="newLoading" status="loading" />
    </view>

    <!-- 热销商品区域 -->
    <view class="goods-section app-card-flat">
      <view class="app-section-header-bar">
        <text class="app-section-header-text">现货热销</text>
        <text class="app-section-header-sub">人气精选</text>
      </view>
      <view class="app-goods-grid">
        <block v-for="item in hotGoods" :key="item._id">
          <view class="app-goods-grid-item app-product-card" @click="goGoodsDetail(item._id)">
            <image class="app-product-image" :src="getGoodsImage(item)" mode="aspectFill" @error="onImageError(item)"></image>
            <view class="app-product-info">
              <text class="app-product-name">{{ item.name }}</text>
              <text class="app-product-meta">{{ item.standard }}</text>
              <text v-if="item.goods_remark" class="app-product-meta">{{ item.goods_remark }}</text>
              <text v-if="item.current_production_date" class="app-product-meta">生产日期: {{ item.current_production_date }}</text>
              <view class="app-product-price-row">
                <text class="app-product-price">¥{{ formatPrice(item.goods_price) }}</text>
                <text v-if="item.original_price && item.original_price > item.goods_price" class="app-product-original-price">¥{{ formatPrice(item.original_price) }}</text>
              </view>
            </view>
            <view class="app-cart-btn" @click.stop="showAddToCart(item)">
              <uni-icons type="plusempty" size="18" color="#ffffff"></uni-icons>
            </view>
          </view>
        </block>
      </view>
      <uni-load-more v-if="hotLoading" status="loading" />
    </view>

    <!-- 数量选择弹窗（普通商品用） -->
    <uni-popup ref="popup" type="center">
      <view class="app-popup-content" @click.stop>
        <text class="app-popup-title">选择数量</text>
        <view class="stock-info">
          可加购物车数: {{ availableStock }} (库存{{ currentStock }}，已加{{ cartCount }})
        </view>
        <uni-number-box v-model="selectedCount" :min="1" @change="onCountChange" />
        <view class="app-popup-btns">
          <button class="app-popup-btn app-popup-btn-cancel" @click="closePopup">取消</button>
          <button class="app-popup-btn app-popup-btn-confirm" @click="addToCart" :disabled="availableStock <= 0">确定</button>
        </view>
      </view>
    </uni-popup>

    <!-- 预售商品数量选择弹窗 -->
    <uni-popup ref="prePopup" type="center">
      <view class="app-popup-content" @click.stop>
        <text class="app-popup-title">选择数量</text>
        <view class="stock-info">库存: {{ currentStock }}</view>
        <uni-number-box v-model="selectedCount" :min="1" @change="onPreCountChange" />
        <view class="app-popup-btns">
          <button class="app-popup-btn app-popup-btn-cancel" @click="closePrePopup">取消</button>
          <button class="app-popup-btn app-popup-btn-confirm" @click="goPreOrder">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatPrice, getGoodsImage, onImageError } from '@/utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      hotGoods: [],
      newGoods: [],
      preGoods: [],
      hotLoading: false,
      newLoading: false,
      preLoading: false,
      selectedGood: null,
      selectedCount: 1,
      currentStock: 0,
      cartCount: 0,
      availableStock: 0,
    };
  },
  onLoad() {
    this.loadPreGoods();
    this.loadHotGoods();
    this.loadNewGoods();
  },
  onShow() {
    this.refreshData();
  },
  methods: {
    formatPrice,
    getGoodsImage,
    onImageError,
    async loadPreGoods() {
      this.preLoading = true;
      try {
        const res = await db.collection('goods')
          .where({ is_pre: true, is_on_sale: true })
          .field('name,standard,goods_desc,goods_remark,goods_price,original_price,goods_thumb,remain_count,current_production_date')
          .orderBy('sort_weight', 'desc')
          .limit(10)
          .get();
        this.preGoods = res.result.data;
      } catch (err) {
        console.error('加载预售商品失败', err);
      } finally {
        this.preLoading = false;
      }
    },
    async loadHotGoods() {
      this.hotLoading = true;
      try {
        const res = await db.collection('goods')
          .where({ is_hot: true, is_on_sale: true, is_pre: false })
          .field('name,standard,goods_desc,goods_remark,goods_price,original_price,goods_thumb,remain_count,current_production_date')
          .orderBy('sort_weight', 'desc')
          .limit(10)
          .get();
        this.hotGoods = res.result.data;
      } catch (err) {
        console.error('加载热销商品失败', err);
      } finally {
        this.hotLoading = false;
      }
    },
    async loadNewGoods() {
      this.newLoading = true;
      try {
        const res = await db.collection('goods')
          .where({ is_new: true, is_on_sale: true, is_pre: false })
          .field('name,standard,goods_desc,goods_remark,goods_price,original_price,goods_thumb,remain_count,current_production_date')
          .orderBy('sort_weight', 'desc')
          .limit(10)
          .get();
        this.newGoods = res.result.data;
      } catch (err) {
        console.error('加载新品失败', err);
      } finally {
        this.newLoading = false;
      }
    },
    goGoodsDetail(id) {
      uni.navigateTo({ url: `/pages/goods/detail?id=${id}` });
    },
    showAddToCart(goods) {
      if (!store.userInfo || !store.userInfo._id) {
        uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' });
        return;
      }
      this.selectedGood = goods;
      this.currentStock = goods.remain_count || 0;
      this.selectedCount = 1;
      this.getCartCount(goods._id).then(cartCount => {
        this.cartCount = cartCount;
        this.availableStock = this.currentStock - cartCount;
        this.$refs.popup.open();
      });
    },
    async getCartCount(goodId) {
      const userInfo = store.userInfo;
      if (!userInfo) return 0;
      try {
        const res = await db.collection('my_cart')
          .where({ user_id: userInfo._id, good_id: goodId })
          .get();
        if (res.result.data.length > 0) {
          return res.result.data[0].good_count;
        }
        return 0;
      } catch (err) {
        console.error('查询购物车失败', err);
        return 0;
      }
    },
    async addToCart() {
      if (!this.selectedGood) return;
      const userInfo = store.userInfo;
      if (!userInfo || !userInfo._id) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      if (this.selectedCount > this.availableStock) {
        uni.showModal({
          title: '数量超限',
          content: `最多还可添加 ${this.availableStock} 件（库存${this.currentStock}，已加${this.cartCount}）`,
          showCancel: false
        });
        return;
      }
      if (this.availableStock <= 0) {
        uni.showModal({ title: '提示', content: '库存不足或已全部加入购物车', showCancel: false });
        return;
      }
      this.closePopup();
      uni.showLoading({ title: '加入中...' });
      try {
        const cartRes = await db.collection('my_cart')
          .where({ user_id: userInfo._id, good_id: this.selectedGood._id })
          .get();
        const totalCount = this.cartCount + this.selectedCount;
        if (cartRes.result.data.length > 0) {
          const cartItem = cartRes.result.data[0];
          await db.collection('my_cart').doc(cartItem._id).update({ good_count: totalCount });
        } else {
          await db.collection('my_cart').add({
            good_count: this.selectedCount,
            good_state: true,
            user_id: userInfo._id,
            good_id: this.selectedGood._id
          });
        }
        uni.hideLoading();
        uni.showToast({ title: '已加入购物车', icon: 'success' });
        uni.$emit('cartUpdated');
      } catch (err) {
        uni.hideLoading();
        console.error('加入购物车失败', err);
        uni.showModal({ content: err.message || '加入失败', showCancel: false });
      }
    },
    closePopup() {
      this.$refs.popup.close();
    },
    showPreOrder(goods) {
      if (!store.userInfo || !store.userInfo._id) {
        uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' });
        return;
      }
      this.selectedGood = goods;
      this.currentStock = goods.remain_count || 0;
      this.selectedCount = 1;
      this.$refs.prePopup.open();
    },
    goPreOrder() {
      if (!this.selectedGood) return;
      if (this.selectedCount > this.currentStock) {
        uni.showModal({ title: '数量超限', content: `库存仅剩 ${this.currentStock} 件，请减少数量`, showCancel: false });
        return;
      }
      if (this.currentStock <= 0) {
        uni.showModal({ title: '提示', content: '库存不足', showCancel: false });
        return;
      }
      this.closePrePopup();
      uni.setStorageSync('preOrderItem', { good: this.selectedGood, count: this.selectedCount });
      uni.navigateTo({ url: '/pages/order/confirm?type=pre' });
    },
    closePrePopup() {
      this.$refs.prePopup.close();
    },
    onCountChange(value) {
      if (value > this.availableStock) {
        uni.showToast({ title: `最多可加${this.availableStock}件`, icon: 'none', duration: 2000 });
        this.$nextTick(() => { this.selectedCount = this.availableStock; });
      }
    },
    onPreCountChange(value) {
      if (value > this.currentStock) {
        uni.showToast({ title: `库存仅剩${this.currentStock}件`, icon: 'none', duration: 2000 });
        this.$nextTick(() => { this.selectedCount = this.currentStock; });
      }
    },
    refreshData() {
      this.loadPreGoods();
      this.loadHotGoods();
      this.loadNewGoods();
    },
  }
};
</script>

<style scoped>
.goods-section { padding: 10px; }
.app-goods-grid { justify-content: flex-start; gap: 10px; }
.app-goods-grid-item { width: calc(50% - 5px); }
.app-product-image { height: 140px; }
.stock-info { text-align: center; color: #666; font-size: 14px; margin-bottom: 10px; }
</style>
