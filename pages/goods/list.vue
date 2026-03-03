<template>
  <view class="container">
    <!-- 顶部工具栏：第一行（状态筛选 + 搜索） -->
    <view class="toolbar">
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
    <view class="category-filter-row">
      <picker @change="onCategoryFilterChange" :value="categoryIndex" :range="categoryOptions" range-key="text">
        <view class="picker category-picker">
          {{ categoryOptions[categoryIndex].text }}
          <text class="uni-icon uni-icon-arrowdown">▼</text>
        </view>
      </picker>
    </view>

    <!-- 商品列表 -->
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, pagination, loading, hasMore, error }"
      :collection="collectionList"
      :page-size="20"
      :where="whereCondition"
      field="name,remain_count,goods_price,standard,category,goods_swiper_imgs,is_hot,is_new,is_on_sale,production_date,shelf_life_months"
      @load="onDataLoad"
    >
      <view v-if="error" class="error">{{ error.message }}</view>
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
                <!-- 商品图片 -->
                <image
                  class="thumb"
                  :src="getImageSrc(item)"
                  @error="onImageError(item)"
                  mode="aspectFill"
                />
                <view class="info">
                  <text class="name">{{ item.name }}</text>
                  <text class="price">¥{{ (item.goods_price / 100).toFixed(2) }}</text>
                  <text class="detail">
                    库存:{{ item.remain_count }} | 规格:{{ item.standard }}
                    | 分类:{{ getCategoryName(item.category) }}
                    | 生产日期:{{ item.production_date || '-' }}
                    | 保质期:{{ item.shelf_life_months != null ? item.shelf_life_months + '个月' : '-' }}
                  </text>
                  <view class="tags">
                    <text v-if="item.is_hot" class="tag hot">热销</text>
                    <text v-if="item.is_new" class="tag new">新品</text>
                    <text v-if="!item.is_on_sale" class="tag off">下架</text>
                  </view>
                </view>
                <!-- 加号按钮（购物车） -->
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

    <!-- 数量选择弹窗 -->
   <!-- <uni-popup ref="popup" type="center">
      <view class="popup-content" @click.stop>
        <text class="popup-title">选择数量</text>
        <view class="stock-info">
          可加购物车数: {{ availableStock }} (库存{{ currentStock }}，已加{{ cartCount }})
        </view>
        <uni-number-box
          v-model="selectedCount"
          :min="1"
          
        />
        <view class="popup-btns">
          <button class="popup-btn cancel" @click="closePopup">取消</button>
          <button class="popup-btn confirm" @click="addToCart" :disabled="availableStock <= 0">确定</button>
        </view>
      </view>
    </uni-popup> -->
	
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
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      collectionList: 'opendb-mall-goods',
      // 搜索
      searchInput: '',
      searchText: '',
      // 状态筛选（原 filterOptions）
      statusOptions: ['全部标签', '热销', '新品', '下架'],
      statusIndex: 0,
      statusType: 'all', // 对应 'all', 'hot', 'new', 'off'
      // 类别筛选
      categoryOptions: [{ value: '', text: '全部分类' }], // 初始时包含全部分类
      categoryIndex: 0,
      categoryValue: '', // 当前选中的分类ID，''表示全部
      // 分类映射（用于显示分类名称）
      categoryMap: {},
      // 当前选中加入购物车的商品
      selectedGood: null,
      selectedCount: 1,
	  currentStock: 0,          // 当前选中商品的库存
	  cartCount: 0,             // 该用户该商品已在购物车中的数量
	  availableStock: 0        // 剩余可加数量 = 库存 - 购物车数量
    };
  },
  computed: {
    whereCondition() {
      const condition = {};
      // 名称模糊搜索
      if (this.searchText) {
        condition.name = new RegExp(this.searchText, 'i');
      }
      // 状态筛选
      switch (this.statusType) {
        case 'hot':
          condition.is_hot = true;
          break;
        case 'new':
          condition.is_new = true;
          break;
        case 'off':
          condition.is_on_sale = false;
          break;
      }
      // 类别筛选（如果选中了具体分类）
      if (this.categoryValue) {
        condition.category = this.categoryValue;
      }
      return condition;
    }
  },
  onLoad() {
    this.loadAllCategories(); // 预加载分类（用于类别菜单和分类名称显示）
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
    // 预加载全部分类（构造类别菜单和分类映射）
    async loadAllCategories() {
      try {
        const db = uniCloud.databaseForJQL();
        const res = await db.collection('opendb-mall-categories')
          .field('_id, name')
          .get();
        if (res && Array.isArray(res.data)) {
          // 构建分类映射（用于显示名称）
          res.data.forEach(cat => {
            this.categoryMap[cat._id] = cat.name;
          });
          // 构建类别筛选菜单（全部分类 + 具体分类）
          this.categoryOptions = [{ value: '', text: '全部分类' }];
          res.data.forEach(cat => {
            this.categoryOptions.push({ value: cat._id, text: cat.name });
          });
          console.log('分类菜单加载完成', this.categoryOptions);
        } else {
          console.warn('分类加载返回格式异常', res);
        }
      } catch (err) {
        console.error('加载分类失败', err);
      }
    },

    // 根据分类ID获取名称（用于列表显示）
    getCategoryName(catId) {
      if (!catId) return '-';
      return this.categoryMap[catId] || '-';
    },

    // 状态筛选变更
    onStatusFilterChange(e) {
      this.statusIndex = e.detail.value;
      const types = ['all', 'hot', 'new', 'off'];
      this.statusType = types[this.statusIndex];
    },

    // 类别筛选变更
    onCategoryFilterChange(e) {
      this.categoryIndex = e.detail.value;
      this.categoryValue = this.categoryOptions[this.categoryIndex].value;
    },

    // 搜索
    onSearch() {
      this.searchText = this.searchInput;
    },

    // 数据加载完成后的处理（可选）
    onDataLoad(data) {
      console.log('商品数据加载', data);
    },

    getImageSrc(item) {
      if (item._imgError || !item.goods_swiper_imgs || !item.goods_swiper_imgs.length) {
        return '/static/tab/goods-default.png';
      }
      const firstImg = item.goods_swiper_imgs[0];
      return firstImg.url || firstImg.fileID || '/static/tab/goods.png';
    },
    onImageError(item) {
      item._imgError = true;
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
    closePopup() {
      this.$refs.popup.close();
    },
	// 查询购物车中该商品的数量
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
  }
};
</script>

<style scoped>
.container {
  padding: 10px;
}

/* 第一行工具栏（状态 + 搜索） */
.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  background-color: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.filter-menu {
  flex-shrink: 0;
  margin-right: 10px;
  font-size: 16px;
}

.picker {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background-color: #f9f9f9;
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

/* 第二行：类别筛选 */
.category-filter-row {
  width: 100%;
  margin-bottom: 8px;
  background-color: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.category-picker {
  width: 100%;
  justify-content: center;
  font-size: 16px;
}

.error {
  padding: 20px;
  text-align: center;
  color: #ff5500;
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
.name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
}
.price {
  font-size: 16px;
  color: #ff6000;
  font-weight: bold;
  margin-bottom: 4px;
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
.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  color: #fff;
  display: inline-block;
}
.hot {
  background-color: #f37b1d;
}
.new {
  background-color: #4caf50;
}
.off {
  background-color: #999;
}
.cart-add {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 36px;
  height: 36px;
  background-color: #007aff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 2;
}
.popup-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 12px;
  width: 280px;
}
.popup-title {
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  display: block;
}
.popup-btns {
  display: flex;
  margin-top: 20px;
  gap: 10px;
}
.popup-btn {
  flex: 1;
  height: 40px;
  line-height: 40px;
  border-radius: 20px;
  font-size: 14px;
}
.popup-btn.cancel {
  background-color: #f5f5f5;
  color: #666;
}
.popup-btn.confirm {
  background-color: #007aff;
  color: #fff;
}
</style>