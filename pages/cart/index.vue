<template>
  <view class="cart-container">
    <!-- 购物车列表 -->
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="my_cart"
      :where="`user_id == '${userInfo._id}'`"
      :getone="false"
      :getcount="true"
      @load="onCartLoad"
    >
      <view v-if="error" class="error">{{ error.message }}</view>
      <view v-else-if="loading" class="loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="cart-list">
        <view v-for="item in cartList" :key="item._id" class="cart-item" >
          <!-- 商品信息（需关联查询商品表） -->
          <view class="item-select" >
            <checkbox :checked="item.good_state" @click="toggleSelect(item)" />
          </view>
         
		  
		 
		    <image
		      class="item-image"
		      :src="getImageSrc(item.goodsInfo)"
		      @error="onImageError(item)"
		      mode="aspectFill"
			  
			  @click="goGoodsDetail(item.good_id)"
		    />
		  
		  
          <view class="item-info">
            <text class="item-name">{{ item.goodsInfo?.name || '-' }}</text>
			
			
			<text class="item-standard">{{ item.goodsInfo?.standard || '-' }}</text>
            <text class="item-price">¥{{ (item.goodsInfo?.goods_price / 100).toFixed(2) || '0.00' }}</text>
          </view>
          <view class="item-quantity">
            <uni-number-box :value="item.good_count" :min="1" :max="10" @change="(val) => updateQuantity(item, val)" />
          </view>
          <uni-icons type="trash" size="20" color="#999" @click="deleteItem(item._id)" />
        </view>
      </view>
      <view v-else class="empty-cart">购物车还是空的，快去逛逛吧~</view>
    </unicloud-db>

    <!-- 底部操作栏 -->
    <view class="cart-footer">
      <checkbox :checked="allSelected" @click="toggleAll">全选</checkbox>
      <view class="total-price">
        合计：<text class="price">¥{{ totalPrice.toFixed(2) }}</text>
      </view>
      <button class="settle-btn" type="primary" @click="settle">下单({{ selectedCount }})</button>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();

export default {
  data() {
    return {
      userInfo: store.userInfo,
      cartList: [],        // 存储带商品详情的购物车数据
      goodsMap: {},        // 商品ID -> 商品信息映射
    };
  },
  computed: {
    // 全选状态
    allSelected() {
      if (this.cartList.length === 0) return false;
      return this.cartList.every(item => item.good_state);
    },
    // 选中商品数量
    selectedCount() {
      return this.cartList.filter(item => item.good_state).length;
    },
    // 选中商品总价
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
      uni.navigateTo({ url: '/pages/login/login' });
    }
	// 每次页面显示时刷新（用户从其他页面返回购物车）
	    if (this.userInfo && this.userInfo._id) {
	      this.refreshCart();
	    }
	uni.$on('cartUpdated', () => {
	    this.$refs.udb && this.$refs.udb.loadData({ clear: true });
	  });
	  
  },
  onUnload() {
    uni.$off('cartUpdated', this.refreshCart);
  },
  methods: {
	  refreshCart() {
	        if (this.$refs.udb) {
	          this.$refs.udb.loadData({ clear: true });
	        }
	      },
	  // 商品详情
	  goGoodsDetail(id) {
	    uni.navigateTo({ url: `/pages/goods/detail?id=${id}` });
	  },
	  getImageSrc(item) {
	    if (item._imgError || !item.goods_swiper_imgs || !item.goods_swiper_imgs.length) {
	      return '/static/tab/goods-default.png';
	    }
	    const firstImg = item.goods_swiper_imgs[0];
	    return firstImg.url || firstImg.fileID || '/static/tab/goods-default.png';
	  },
	  onImageError(item) {
	    item._imgError = true;
	  },
    // 购物车数据加载后，批量查询商品详情
    async onCartLoad(data) {
      if (!data || data.length === 0) return;
      const goodsIds = data.map(item => item.good_id).filter(id => id);
      if (goodsIds.length === 0) return;

      try {
        const res = await db.collection('opendb-mall-goods')
          .where({ _id: db.command.in(goodsIds) })
          .field('_id,name,standard,goods_price,goods_swiper_imgs')
          .get();
        const goodsMap = {};
        res.result.data.forEach(g => {
          goodsMap[g._id] = g;
        });
        // 将商品详情合并到购物车数据
        this.cartList = data.map(item => ({
          ...item,
          goodsInfo: goodsMap[item.good_id] || null
        }));
        this.goodsMap = goodsMap;
      } catch (err) {
        console.error('加载商品详情失败', err);
      }
    },
    // 切换单个选中
    toggleSelect(item) {
      const newState = !item.good_state;
      db.collection('my_cart').doc(item._id).update({ good_state: newState })
        .then(() => {
          item.good_state = newState;
          this.$forceUpdate(); // 确保视图更新
        })
        .catch(err => {
          uni.showModal({ content: err.message || '操作失败', showCancel: false });
        });
    },
    // 全选/取消全选
    toggleAll() {
      const newState = !this.allSelected;
      const ids = this.cartList.map(item => item._id);
      // 批量更新（注意权限，只能更新自己的）
      Promise.all(ids.map(id => db.collection('my_cart').doc(id).update({ good_state: newState })))
        .then(() => {
          this.cartList.forEach(item => item.good_state = newState);
          this.$forceUpdate();
        })
        .catch(err => {
          uni.showModal({ content: err.message || '操作失败', showCancel: false });
        });
    },
    // 更新数量
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
    // 删除商品
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
    // 结算
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
.cart-container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 60px;
}
.error, .loading, .empty-cart {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}
.cart-list {
  padding: 10px;
}
.cart-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.item-select {
  margin-right: 10px;
}
.item-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  background-color: #f0f0f0;
  margin-right: 10px;
}
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.item-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  font-weight: bold;   /* 加粗 */
}
.item-standard {
  font-size: 12px;
  color: #333;
  margin-bottom: 4px;
}
.item-price {
  font-size: 16px;
  color: #ff6000;
  font-weight: bold;
}
.item-quantity {
  margin: 0 10px;
}
.cart-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.05);
  z-index: 10;
}
.cart-footer checkbox {
  margin-right: 15px;
}
.total-price {
  flex: 1;
  font-size: 14px;
  color: #666;
}
.total-price .price {
  font-size: 18px;
  color: #ff6000;
  font-weight: bold;
}
.settle-btn {
  width: 100px;
  height: 40px;
  line-height: 40px;
  border-radius: 20px;
  font-size: 14px;
}
</style>