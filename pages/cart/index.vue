<template>
  <view class="app-container-no-padding app-pb-60">
    <!-- 购物车列表 -->
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="my_cart"
      :where="{ user_id: userInfo._id }"
      :getone="false"
      :getcount="true"
      @load="onCartLoad"
    >
      <view v-if="error" class="app-error">{{ error.message }}</view>
      <view v-else-if="loading" class="app-loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="cart-list">
        <view v-for="item in cartList" :key="item._id" class="app-card app-goods-item" >
          <view class="item-select" >
            <checkbox :checked="item.good_state" @click="toggleSelect(item)" />
          </view>
          <image
            class="app-goods-image-sm"
            :src="getGoodsImage(item)"
            @error="onImageError(item)"
            mode="aspectFill"
            @click="goGoodsDetail(item.good_id)"
          />
          <view class="app-goods-info">
            <text class="app-goods-name">{{ item.goodsInfo?.name || '-' }}</text>
            <text class="app-goods-standard">{{ item.goodsInfo?.standard || '-' }}</text>
            <text class="app-goods-price">¥{{ formatPrice(item.goodsInfo?.goods_price) }}</text>
          </view>
          <view class="item-quantity">
            <uni-number-box :value="item.good_count" :min="1" :max="10" @change="(val) => updateQuantity(item, val)" />
          </view>
          <uni-icons type="trash" size="20" color="#999" @click="deleteItem(item._id)" />
        </view>
      </view>
      <view v-else class="app-empty">还是空的，快去逛逛吧~</view>
    </unicloud-db>

    <!-- 底部操作栏 -->
    <view class="app-footer-fixed">
      <checkbox :checked="allSelected" @click="toggleAll">全选</checkbox>
      <view class="total-price">
        参考总价：<text class="app-text-price">¥{{ totalPrice.toFixed(2) }}</text>
      </view>
	  <view>（以实际单据为准）</view>
      <button class="app-btn app-btn-primary" type="primary" @click="settle">预定({{ selectedCount }})</button>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatPrice, getGoodsImage, onImageError } from '@/utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      userInfo: store.userInfo,
      cartList: [],
      goodsMap: {},
    };
  },
  computed: {
    allSelected() {
      if (this.cartList.length === 0) return false;
      return this.cartList.every(item => item.good_state);
    },
    selectedCount() {
      return this.cartList.filter(item => item.good_state).length;
    },
    totalPrice() {
      return this.cartList.reduce((sum, item) => {
        if (item.good_state && item.goodsInfo) {
          sum += (item.goodsInfo.goods_price / 100) * item.good_count;
        }
        return sum;
      }, 0);
    }
  },
  onLoad() {
    if (!this.userInfo || !this.userInfo._id) {
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' });
    }
    if (this.userInfo && this.userInfo._id) {
      this.refreshCart();
    }
    uni.$on('cartUpdated', this.refreshCart);
  },
  onUnload() {
    uni.$off('cartUpdated', this.refreshCart);
  },
  methods: {
    formatPrice,
    getGoodsImage,
    onImageError,
    refreshCart() {
      if (this.$refs.udb) {
        this.$refs.udb.loadData({ clear: true });
      }
    },
    goGoodsDetail(id) {
      uni.navigateTo({ url: `/pages/goods/detail?id=${id}` });
    },
    async onCartLoad(data) {
      if (!data || data.length === 0) return;
      const goodsIds = data.map(item => item.good_id).filter(id => id);
      if (goodsIds.length === 0) return;

      try {
        const res = await db.collection('goods')
          .where({ _id: db.command.in(goodsIds) })
          .field('_id,name,standard,goods_price,goods_thumb')
          .get();
        const goodsMap = {};
        res.result.data.forEach(g => {
          goodsMap[g._id] = g;
        });
        this.cartList = data.map(item => ({
          ...item,
          goodsInfo: goodsMap[item.good_id] || null
        }));
        this.goodsMap = goodsMap;
      } catch (err) {
        console.error('加载商品详情失败', err);
      }
    },
    toggleSelect(item) {
      const newState = !item.good_state;
      db.collection('my_cart').doc(item._id).update({ good_state: newState })
        .then(() => {
          item.good_state = newState;
          this.$forceUpdate();
        })
        .catch(err => {
          uni.showModal({ content: err.message || '操作失败', showCancel: false });
        });
    },
    toggleAll() {
      const newState = !this.allSelected;
      const ids = this.cartList.map(item => item._id);
      Promise.all(ids.map(id => db.collection('my_cart').doc(id).update({ good_state: newState })))
        .then(() => {
          this.cartList.forEach(item => item.good_state = newState);
          this.$forceUpdate();
        })
        .catch(err => {
          uni.showModal({ content: err.message || '操作失败', showCancel: false });
        });
    },
    updateQuantity(item, newCount) {
      if (newCount === item.good_count) return;
      db.collection('my_cart').doc(item._id).update({ good_count: newCount })
        .then(() => {
          item.good_count = newCount;
          this.$forceUpdate();
        })
        .catch(err => {
          uni.showModal({ content: err.message || '操作失败', showCancel: false });
        });
    },
    deleteItem(id) {
      uni.showModal({
        title: '提示',
        content: '确定要删除该商品吗？',
        success: (res) => {
          if (res.confirm) {
            db.collection('my_cart').doc(id).remove()
              .then(() => {
                this.cartList = this.cartList.filter(item => item._id !== id);
                this.$forceUpdate();
                uni.showToast({ title: '删除成功', icon: 'success' });
              })
              .catch(err => {
                uni.showModal({ content: err.message || '删除失败', showCancel: false });
              });
          }
        }
      });
    },
    settle() {
      const selected = this.cartList.filter(item => item.good_state);
      if (selected.length === 0) {
        uni.showToast({ title: '请选择要下单的商品', icon: 'none' });
        return;
      }
      uni.setStorageSync('selectedCartItems', selected);
      uni.navigateTo({ url: '/pages/order/confirm' });
    }
  }
};
</script>

<style scoped>
.cart-list {
  padding: 10px;
}
.item-select {
  margin-right: 10px;
}
.item-quantity {
  margin: 0 10px;
}
.total-price {
  flex: 1;
  font-size: 14px;
  color: #666;
  margin-left: 15px;
}
</style>
