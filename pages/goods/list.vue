<template>
  <view class="page-container">
    <!-- 顶部工具栏：第一行（状态筛选 + 搜索） -->
    <view class="toolbar app-card-flat">
      <view class="filter-menu">
        <picker @change="onStatusFilterChange" :value="statusIndex" :range="statusOptions">
          <view class="picker">
            {{ statusOptions[statusIndex] }}
            <text class="uni-icon uni-icon-arrowdown">▼</text>
          </view>
        </picker>
      </view>
      <view class="search-box">
        <input
          class="search-input"
          type="text"
          v-model="searchInput"
          placeholder="输入商品名称"
          confirm-type="search"
          @confirm="onSearch"
        />
        <button class="search-btn" type="default" size="mini" @click="onSearch">搜索</button>
      </view>
    </view>

    <!-- 第二行：类别筛选菜单 -->
    <view class="category-filter-row app-card-flat">
      <picker @change="onCategoryFilterChange" :value="categoryIndex" :range="categoryOptions" range-key="text">
        <view class="picker category-picker">
          {{ categoryOptions[categoryIndex].text }}
          <text class="uni-icon uni-icon-arrowdown">▼</text>
        </view>
      </picker>
    </view>

    <!-- 商品列表区域 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      refresher-enabled
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :refresher-triggered="refreshing"
    >
      <unicloud-db
        ref="udb"
        v-slot:default="{ data, pagination, loading, hasMore, error }"
        :key="refreshKey"
        collection="goods"
        :page-size="20"
        :where="whereCondition"
        field="name,remain_count,goods_price,original_price,standard,category,goods_thumb,goods_remark,is_hot,is_new,is_on_sale,shelf_life_months"
        @load="onDataLoad"
      >
        <view v-if="error" class="app-error">{{ error.message }}</view>
        <view v-else-if="data">
          <uni-list>
            <uni-list-item
              v-for="(item, index) in data"
              :key="index"
              showArrow
              :clickable="true"
              @click="handleItemClick(item._id)"
            >
              <template v-slot:body>
                <view class="item-content">
                  <image
                    class="thumb"
                    :src="getGoodsImage(item)"
                    @error="onImageError(item)"
                    mode="aspectFill"
                  />
                  <view class="info">
                    <text class="name">{{ item.name }}</text>
                    <view class="price-row">
                      <text class="price app-text-price">¥{{ formatPrice(item.goods_price) }}</text>
                      <text v-if="item.original_price && item.original_price > item.goods_price" class="app-original-price">¥{{ formatPrice(item.original_price) }}</text>
                      <text class="standard">规格:{{ item.standard|| ''}}</text>
                    </view>
                    <text class="detail">
                      库存:{{ item.remain_count }}
                      | 分类:{{ getCategoryName(item.category) }}
                      | 保质期:{{ item.shelf_life_months != null ? item.shelf_life_months + '个月' : '-' }}
                    </text>
                    <text v-if="item.goods_remark" class="remark app-text-grey">{{ item.goods_remark }}</text>
                    <view class="tags">
                      <text v-if="item.is_hot" class="app-tag app-tag-hot">热销</text>
                      <text v-if="item.is_new" class="app-tag app-tag-new">新品</text>
                      <text v-if="!item.is_on_sale" class="app-tag app-tag-off">下架</text>
                    </view>
                  </view>
                  <view class="cart-add" @click.stop="showAddToCart(item)">
                    <uni-icons type="plusempty" size="20" color="#ffffff"></uni-icons>
                  </view>
                </view>
              </template>
            </uni-list-item>
          </uni-list>
        </view>
        <uni-load-more :status="loading ? 'loading' : (hasMore ? 'more' : 'noMore')" />
      </unicloud-db>
    </scroll-view>

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
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatPrice, getGoodsImage, onImageError } from '@/utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      refreshKey: 0,
      collectionList: 'goods',
      searchInput: '',
      searchText: '',
      statusOptions: ['全部标签', '热销', '新品'],
      statusIndex: 0,
      statusType: 'all',
      categoryOptions: [{ value: '', text: '全部分类' }],
      categoryIndex: 0,
      categoryValue: '',
      categoryMap: {},
      selectedGood: null,
      selectedCount: 1,
      currentStock: 0,
      cartCount: 0,
      availableStock: 0,
      refreshing: false
    };
  },

  computed: {
    whereCondition() {
      const condition = {};
      if (this.searchText) {
        condition.name = new RegExp(this.searchText, 'i');
      }
      switch (this.statusType) {
        case 'hot': condition.is_hot = true; break;
        case 'new': condition.is_new = true; break;
        case 'off': condition.is_on_sale = false; break;
      }
      if (this.categoryValue) {
        condition.category = this.categoryValue;
      }
      return condition;
    },
  },
  onShow() {
    if (this.$refs.udb) {
      this.$refs.udb.loadData({ clear: true });
    }
  },
  onLoad() {
    this.loadAllCategories();
  },
  onPullDownRefresh() {
    this.$refs.udb.loadData({ clear: true }, () => {
      uni.stopPullDownRefresh();
    });
  },
  onReachBottom() {
    this.$refs.udb.loadMore();
  },
  methods: {
    formatPrice,
    getGoodsImage,
    onImageError,
    onRefresh() {
      this.refreshing = true;
      this.$refs.udb.loadData({ clear: true }, () => {
        this.refreshing = false;
      });
    },
    loadMore() {
      this.$refs.udb.loadMore();
    },
    async loadAllCategories() {
      try {
        const db = uniCloud.databaseForJQL();
        const res = await db.collection('opendb-mall-categories')
          .field('_id, name')
          .get();
        if (res && Array.isArray(res.data)) {
          res.data.forEach(cat => {
            this.categoryMap[cat._id] = cat.name;
          });
          this.categoryOptions = [{ value: '', text: '全部分类' }];
          res.data.forEach(cat => {
            this.categoryOptions.push({ value: cat._id, text: cat.name });
          });
        }
      } catch (err) {
        console.error('加载分类失败', err);
      }
    },
    getCategoryName(catId) {
      if (!catId) return '-';
      return this.categoryMap[catId] || '-';
    },
    onStatusFilterChange(e) {
      this.searchInput = '';
      this.searchText = '';
      this.statusIndex = e.detail.value;
      const types = ['all', 'hot', 'new', 'off'];
      this.statusType = types[this.statusIndex];
      this.refreshKey++;
    },
    onCategoryFilterChange(e) {
      this.searchInput = '';
      this.searchText = '';
      this.categoryIndex = e.detail.value;
      this.categoryValue = this.categoryOptions[this.categoryIndex].value;
      this.refreshKey++;
    },
    onSearch() {
      this.searchText = this.searchInput;
      this.refreshKey++;
    },
    onDataLoad(data) {
      console.log('商品数据加载', data);
    },
    handleItemClick(id) {
      uni.navigateTo({
        url: './detail?id=' + id,
        events: {
          refreshData: () => {
            this.$refs.udb.loadData({ clear: true });
          }
        }
      });
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
    closePopup() {
      this.$refs.popup.close();
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
    onCountChange(value) {
      if (value > this.availableStock) {
        uni.showToast({
          title: `最多可加${this.availableStock}件`,
          icon: 'none',
          duration: 2000
        });
        this.$nextTick(() => {
          this.selectedCount = this.availableStock;
        });
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
  }
};
</script>

<style>
page {
  height: 100%;
  overflow: hidden;
}
</style>
<style scoped>
.page-container {
  position: relative;
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.toolbar,
.category-filter-row {
  flex-shrink: 0;
}
.list-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
  background-color: #f8f8f8;
  width: 100%;
}
.picker {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background-color: #f9f9f9;
}
.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 10px;
}
.filter-menu {
  flex-shrink: 0;
  margin-right: 10px;
  font-size: 16px;
}
.uni-icon-arrowdown {
  margin-left: 4px;
  font-size: 14px;
  color: #666;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
}
.search-input {
  flex: 1;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 20px 0 0 20px;
  padding: 0 12px;
  font-size: 14px;
  background-color: #f5f5f5;
}
.search-btn {
  flex-shrink: 0;
  height: 36px;
  line-height: 36px;
  border-radius: 0 20px 20px 0;
  margin-left: -1px;
  font-size: 14px;
  background-color: #007aff;
  color: #fff;
  border: none;
}
.category-filter-row {
  width: 100%;
  margin-bottom: 8px;
  padding: 8px 10px;
}
.category-picker {
  width: 100%;
  justify-content: center;
  font-size: 16px;
}
.item-content {
  display: flex;
  align-items: flex-start;
  width: 100%;
  position: relative;
}
.thumb {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  margin-right: 12px;
  background-color: #f5f5f5;
  flex-shrink: 0;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.info .name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
}
.price-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.info .price {
  font-size: 16px;
}
.standard {
  font-size: 13px;
  color: #666;
  margin-left: 8px;
}
.remark {
  margin-bottom: 4px;
  line-height: 1.4;
}
.detail {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
  line-height: 1.4;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cart-add {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 44px;
  height: 44px;
  background-color: rgba(0, 122, 255, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 2;
}
.stock-info {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}
</style>
