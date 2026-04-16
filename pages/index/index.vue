<template>
  <view class="index-container">
    <!-- 预售商品区域 -->
    <view class="goods-section">
      <view class="section-title">预售[欢迎直接下单,届时安排配送]</view>
      <view class="goods-list">
        <block v-for="item in preGoods" :key="item._id">
          <view class="goods-item" @click="goGoodsDetail(item._id)">
            <image class="goods-image" :src="getGoodsImage(item)" mode="aspectFill"></image>
            <view class="goods-info">
              <text class="goods-name">{{ item.name }}</text>
              <text class="goods-standard">{{ item.standard }}</text>
              <text class="goods_desc">{{ item.goods_desc }}</text>
              <text class="goods-price">¥{{ (item.goods_price / 100).toFixed(2) }}</text>
            </view>
            <!-- 预售商品加号按钮：直接下单 -->
            <view class="add-btn" @click.stop="showPreOrder(item)">
              <uni-icons type="plusempty" size="20" color="#ffffff"></uni-icons>
            </view>
          </view>
        </block>
      </view>
      <uni-load-more v-if="preLoading" status="loading" />
    </view>

    <!-- 新品商品区域 -->
    <view class="goods-section">
      <view class="section-title">✨ 新品推荐</view>
      <view class="goods-list">
        <block v-for="item in newGoods" :key="item._id">
          <view class="goods-item" @click="goGoodsDetail(item._id)">
            <image class="goods-image" :src="getGoodsImage(item)" mode="aspectFill"></image>
            <view class="goods-info">
              <text class="goods-name">{{ item.name }}</text>
              <text class="goods-standard">{{ item.standard }}</text>
              <text class="goods-price">¥{{ (item.goods_price / 100).toFixed(2) }}</text>
            </view>
            <!-- 普通商品加号按钮：加入购物车 -->
            <view class="add-btn" @click.stop="showAddToCart(item)">
              <uni-icons type="plusempty" size="20" color="#ffffff"></uni-icons>
            </view>
          </view>
        </block>
      </view>
      <uni-load-more v-if="newLoading" status="loading" />
    </view>

    <!-- 热销商品区域 -->
    <view class="goods-section">
      <view class="section-title">🔥 热销商品</view>
      <view class="goods-list">
        <block v-for="item in hotGoods" :key="item._id">
          <view class="goods-item" @click="goGoodsDetail(item._id)">
            <image class="goods-image" :src="getGoodsImage(item)" mode="aspectFill"></image>
            <view class="goods-info">
              <text class="goods-name">{{ item.name }}</text>
              <text class="goods-standard">{{ item.standard }}</text>
              <text class="goods-price">¥{{ (item.goods_price / 100).toFixed(2) }}</text>
            </view>
            <!-- 普通商品加号按钮：加入购物车 -->
            <view class="add-btn" @click.stop="showAddToCart(item)">
              <uni-icons type="plusempty" size="20" color="#ffffff"></uni-icons>
            </view>
          </view>
        </block>
      </view>
      <uni-load-more v-if="hotLoading" status="loading" />
    </view>

    <!-- 数量选择弹窗（普通商品用） -->
    <uni-popup ref="popup" type="center">
      <view class="popup-content" @click.stop>
        <text class="popup-title">选择数量</text>
        <view class="stock-info">
          可加购物车数: {{ availableStock }} (库存{{ currentStock }}，已加{{ cartCount }})
        </view>
        <uni-number-box v-model="selectedCount" :min="1" :max="99999" />
        <view class="popup-btns">
          <button class="popup-btn cancel" @click="closePopup">取消</button>
          <button class="popup-btn confirm" @click="addToCart" :disabled="availableStock <= 0">确定</button>
        </view>
      </view>
    </uni-popup>

    <!-- 预售商品数量选择弹窗 -->
    <uni-popup ref="prePopup" type="center">
      <view class="popup-content" @click.stop>
        <text class="popup-title">选择数量</text>
        <view class="stock-info">库存: {{ currentStock }}</view>
        <uni-number-box v-model="selectedCount" :min="1" :max="99999" />
        <view class="popup-btns">
          <button class="popup-btn cancel" @click="closePrePopup">取消</button>
          <button class="popup-btn confirm" @click="goPreOrder">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';

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
      selectedGood: null,      // 当前选中的商品
      selectedCount: 1,         // 选择的购买数量
      currentStock: 0,          // 当前选中商品的库存
      cartCount: 0,             // 该用户该商品已在购物车中的数量
      availableStock: 0,        // 剩余可加数量 = 库存 - 购物车数量
      // 定时刷新相关
      refreshTimer: null,
      refreshInterval: 10000,   // 10秒刷新一次
    };
  },
  onLoad() {
    this.loadPreGoods();
    this.loadHotGoods();
    this.loadNewGoods();
  },
  onShow() {
    this.startRefreshTimer();
  },
  onHide() {
    this.clearRefreshTimer();
  },
  onUnload() {
    this.clearRefreshTimer();
  },
  methods: {
    // 加载预售商品
    async loadPreGoods() {
      this.preLoading = true;
      try {
        const res = await db.collection('opendb-mall-goods')
          .where({ is_pre: true, is_on_sale: true })
          .field('name,standard,goods_desc,goods_price,goods_swiper_imgs,remain_count')
          .orderBy('create_date', 'desc')
          .limit(10)
          .get();
        this.preGoods = res.result.data;
      } catch (err) {
        console.error('加载预售商品失败', err);
      } finally {
        this.preLoading = false;
      }
    },
    // 加载热销商品
    async loadHotGoods() {
      this.hotLoading = true;
      try {
        const res = await db.collection('opendb-mall-goods')
          .where({ is_hot: true, is_on_sale: true, is_pre: false || null})
          .field('name,standard,goods_price,goods_swiper_imgs,remain_count')
          .orderBy('create_date', 'desc')
          .limit(10)
          .get();
        this.hotGoods = res.result.data;
      } catch (err) {
        console.error('加载热销商品失败', err);
      } finally {
        this.hotLoading = false;
      }
    },
    // 加载新品
    async loadNewGoods() {
      this.newLoading = true;
      try {
        const res = await db.collection('opendb-mall-goods')
          .where({ is_new: true, is_on_sale: true, is_pre: false|| null })
          .field('name,standard,goods_price,goods_thumb,goods_swiper_imgs,remain_count')
          .orderBy('create_date', 'desc')
          .limit(10)
          .get();
        this.newGoods = res.result.data;
      } catch (err) {
        console.error('加载新品失败', err);
      } finally {
        this.newLoading = false;
      }
    },
    // 获取商品首图
    getGoodsImage(item) {
      if (item.goods_swiper_imgs && item.goods_swiper_imgs.length) {
        const first = item.goods_swiper_imgs[0];
        return first.url || first.fileID || '/static/tab/goods-default.png';
      }
      return item.goods_thumb || '/static/tab/goods-default.png';
    },
    // 商品详情
    goGoodsDetail(id) {
      uni.navigateTo({ url: `/pages/goods/detail?id=${id}` });
    },

    // ========== 普通商品加购逻辑 ==========
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
      // 校验本次添加数量是否超过可加数量
      if (this.selectedCount > this.availableStock) {
        uni.showModal({
          title: '提示',
          content: `最多还可添加 ${this.availableStock} 件`,
          showCancel: false
        });
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
          await db.collection('my_cart').doc(cartItem._id).update({
            good_count: totalCount
          });
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

    // ========== 预售商品下单逻辑 ==========
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
      // 校验数量是否超过库存
      if (this.selectedCount > this.currentStock) {
        uni.showModal({
          title: '提示',
          content: `库存仅剩 ${this.currentStock} 件`,
          showCancel: false
        });
        return;
      }
      this.closePrePopup();
      // 将预售商品信息存入缓存，跳转到订单确认页面
      uni.setStorageSync('preOrderItem', {
        good: this.selectedGood,
        count: this.selectedCount
      });
      uni.navigateTo({ url: '/pages/order/confirm?type=pre' });
    },
    closePrePopup() {
      this.$refs.prePopup.close();
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
      // 同时加载三个区域的数据，不阻塞界面
      Promise.all([
        this.loadPreGoods(),
        this.loadHotGoods(),
        this.loadNewGoods()
      ]).catch(err => console.error('定时刷新数据失败', err));
    },
  }
};
</script>

<style scoped>
.index-container { background-color: #f5f5f5; min-height: 100vh; padding: 10px; }
.goods-section { background-color: #fff; border-radius: 12px; padding: 10px; margin-bottom: 10px; }
.section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; padding-left: 5px; }
.goods-list { display: flex; flex-wrap: wrap; justify-content: space-between; }
.goods-item { width: 30%; background-color: #fff; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; position: relative; }
.goods-image { width: 100%; height: 90px; background-color: #f0f0f0; }
.goods-info { padding: 8px; }
/* .goods-name { font-size: 12px; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } */
.goods-name {
  font-size: 14px;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  word-wrap: break-word;
}
.goods-standard { font-size: 12px; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goods_desc { font-size: 12px; color: #55aaff; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goods-price { font-size: 14px; color: #ff6000; font-weight: bold; display: block; margin-top: 4px; }
.add-btn { position: absolute; right: 5px; bottom: 5px; width: 32px; height: 32px; background-color:  rgba(0, 122, 255, 0.5);  border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.popup-content { background-color: #fff; padding: 20px; border-radius: 12px; width: 280px; }
.popup-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 10px; display: block; }
.stock-info { text-align: center; color: #666; font-size: 14px; margin-bottom: 10px; }
.popup-btns { display: flex; margin-top: 20px; gap: 10px; }
.popup-btn { flex: 1; height: 40px; line-height: 40px; border-radius: 20px; font-size: 14px; }
.popup-btn.cancel { background-color: #f5f5f5; color: #666; }
.popup-btn.confirm { background-color: #007aff; color: #fff; }
</style>