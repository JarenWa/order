<template>
  <view class="page-container">
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
		  <button type="default" size="mini" @click="setCategory">
			  <text >设置分类</text>
		  </button>
		
	    <picker @change="onCategoryFilterChange" :value="categoryIndex" :range="categoryOptions" range-key="text">
	      <view class="picker category-picker">
	        {{ categoryOptions[categoryIndex].text }}
	        <text class="uni-icon uni-icon-arrowdown">▼</text>
	      </view>
	    </picker>
	  </view>
	  
	  
    <scroll-view
      class="list-scroll"
      scroll-y
      refresher-enabled
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :refresher-triggered="refreshing"
    >
     

      <!-- 数据列表 -->
      <unicloud-db
        ref="udb"
        v-slot:default="{ data, loading, hasMore, error }"
        :collection="collectionList"
        :page-size="20"
		:key="refreshKey"
        :where="whereCondition"
        field="name,remain_count,goods_price,standard,category,goods_swiper_imgs,is_hot,is_new,is_on_sale,is_pre,production_date,shelf_life_months"
        @load="onDataLoad"
        :manual="true"
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
                    <view class="tags-row">
                      <view class="tags">
                        <text v-if="item.is_hot" class="tag hot">热销</text>
                        <text v-if="item.is_new" class="tag new">新品</text>
                        <text v-if="!item.is_on_sale" class="tag off">下架</text>
                        <text v-if="item.is_pre" class="tag pre">预售</text>
                      </view>
                      <button class="stock-in-btn" size="mini" type="default" @click.stop="showStockDialog(item)">入库</button>
                    </view>
                  </view>
                </view>
              </template>
            </uni-list-item>
          </uni-list>
        </view>
        <uni-load-more :status="loading ? 'loading' : (hasMore ? 'more' : 'noMore')" />
      </unicloud-db>
    </scroll-view>

    <!-- 悬浮按钮：固定在右下角，不随滚动 -->
    <uni-fab ref="fab" horizontal="right" vertical="bottom" :pop-menu="false" @fabClick="fabClick" />

    <!-- 入库弹窗 -->
    <uni-popup ref="stockPopup" type="center" :mask-click="false">
      <view class="popup-container">
        <view class="popup-title">库存修改</view>
        <view class="popup-item">
          <text class="label">库存数量：</text>
          <input class="input" type="number" v-model="editStock" placeholder="请输入库存" />
        </view>
        <view class="popup-item">
          <text class="label">生产日期：</text>
          <picker mode="date" fields="month" :value="editProductionDate" @change="onProductionDateChange">
            <view class="picker-date">{{ editProductionDate || '请选择年月' }}</view>
          </picker>
        </view>
        <view class="popup-buttons">
          <button class="cancel-btn" @click="cancelStockDialog">取消</button>
          <button class="confirm-btn" type="primary" @click="confirmStockUpdate">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
export default {
  data() {
    return {
		refreshKey: 0,
      collectionList: 'opendb-mall-goods',
      searchInput: '',
      searchText: '',
      statusOptions: ['全部标签', '热销', '新品', '下架', '预售'],
      statusIndex: 0,
      statusType: 'all',
      categoryOptions: [{ value: '', text: '全部分类' }],
      categoryIndex: 0,
      categoryValue: '',
      categoryMap: {},
      refreshing: false,
      refreshTimer: null,
      refreshInterval: 10000,
      currentGoodsId: null,
      editStock: 0,
      editProductionDate: ''
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
        case 'pre': condition.is_pre = true; break;
      }
      if (this.categoryValue) {
        condition.category = this.categoryValue;
      }
      return condition;
    }
  },
  created() {
    this.loadAllCategories().then(() => {
      this.$nextTick(() => {
        this.$refs.udb && this.$refs.udb.loadData();
      });
    });
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
	setCategory() {
		uni.navigateTo({
		  url: '../opendb-mall-categories/list',
		  events: {
		    refreshData: () => {
		              // 刷新分类数据
		              this.loadAllCategories();
		              // 刷新商品列表（如果有筛选条件可能变化）
		              this.$refs.udb && this.$refs.udb.loadData({ clear: true });
		            }
		  }
		});
	},
    getCategoryName(catId) {
      if (!catId) return '-';
      return this.categoryMap[catId] || '-';
    },
    onStatusFilterChange(e) {
      // 清空搜索
        this.searchInput = '';
        this.searchText = '';
        // 更新状态筛选
        this.statusIndex = e.detail.value;
        const types = ['all', 'hot', 'new', 'off', 'pre'];
        this.statusType = types[this.statusIndex];
        // 强制刷新：改变 refreshKey 后，unicloud-db 会重新创建，或者您可以直接调用 loadData
            // 但为了可靠，同时调用 loadData 并增加 key
            this.refreshKey++;
            this.$nextTick(() => {
              this.$refs.udb && this.$refs.udb.loadData({ clear: true });
            });
    },
    onCategoryFilterChange(e) {
      // 清空搜索
        this.searchInput = '';
        this.searchText = '';
        // 更新类别筛选
        this.categoryIndex = e.detail.value;
        this.categoryValue = this.categoryOptions[this.categoryIndex].value;
        this.refreshKey++;
            this.$nextTick(() => {
              this.$refs.udb && this.$refs.udb.loadData({ clear: true });
            });
    },
    onSearch() {
      this.searchText = this.searchInput;
	   this.refreshKey++;
      this.$nextTick(() => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          });
    },
    onRefresh() {
      this.refreshing = true;
      this.$refs.udb.loadData({ clear: true }, () => {
        this.refreshing = false;
      });
    },
    loadMore() {
      this.$refs.udb.loadMore();
    },
    onDataLoad(data) {
      console.log('商品数据加载', data);
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
    handleItemClick(id) {
      uni.navigateTo({
        url: '../opendb-mall-goods/detail?id=' + id,
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    fabClick() {
      uni.navigateTo({
        url: '../opendb-mall-goods/add',
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
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
      if (this.$refs.udb) {
        this.$refs.udb.loadData({ clear: true });
      }
    },
    showStockDialog(item) {
      this.currentGoodsId = item._id;
      this.editStock = item.remain_count;
      // 生产日期确保为年月格式（若原有数据包含日，只取前7位）
      let prodDate = item.production_date || '';
      if (prodDate && prodDate.length > 7) {
        prodDate = prodDate.substring(0, 7);
      }
      this.editProductionDate = prodDate;
      this.$refs.stockPopup.open();
    },
    onProductionDateChange(e) {
      this.editProductionDate = e.detail.value;
    },
    cancelStockDialog() {
      this.$refs.stockPopup.close();
      this.currentGoodsId = null;
      this.editStock = 0;
      this.editProductionDate = '';
    },
    async confirmStockUpdate() {
        // 关键：检查 currentGoodsId 是否有效
        if (!this.currentGoodsId) {
          uni.showToast({ title: '商品信息丢失，请重试', icon: 'none' });
          return;
        }
    
        const stock = parseInt(this.editStock);
        if (isNaN(stock) || stock < 0) {
          uni.showToast({ title: '请输入有效的库存数量', icon: 'none' });
          return;
        }
    
        try {
          const db = uniCloud.database();
          const res = await db.collection('opendb-mall-goods').doc(this.currentGoodsId).update({
            remain_count: stock,
            production_date: this.editProductionDate
          });
           console.log('更新结果:', res); // 打印查看实际返回
            uni.showToast({ title: '更新成功', icon: 'success' });
			this.$refs.stockPopup.close();
			 // 刷新列表
			    if (this.$refs.udb) {
			      this.$refs.udb.loadData({ clear: true }, () => {
			        console.log('列表已刷新');
			      });
			    } else {
			      console.warn('未找到 udb 引用');
			    }
            // 其他操作
          } catch (err) {
            console.error('更新失败', err);
            uni.showToast({ title: '更新失败，请检查网络', icon: 'none' });
          }finally {
          // 清空数据
          this.currentGoodsId = null;
          this.editStock = 0;
          this.editProductionDate = '';
        }
      }
  }
};
</script>

<style scoped>
/* 页面容器，使 scroll-view 占满剩余空间，悬浮按钮相对于此容器固定 */
.page-container {
	  display: flex;
	  flex-direction: column;
	  height: 100vh;  
}
.list-scroll {
  flex: 0.85;
  	overflow-y: auto;          
  /* height: 100%; */
  background-color: #f5f5f5;
}

/* 工具栏样式保持不变 */
.toolbar {
  display: flex;
  align-items: center;
  margin: 10px;
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

.category-filter-row {
  margin: 0 10px 10px;
  background-color: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 10px;  /* 按钮与选择器间距 */
}
.category-filter-row button {
  flex-shrink: 0;  /* 防止按钮被压缩 */
}
.category-picker {
  flex: 1;  /* 占据剩余宽度 */
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
.tags-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
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
.hot { background-color: #f37b1d; }
.new { background-color: #4caf50; }
.off { background-color: #999; }
.pre { background-color: #999; }
.stock-in-btn {
  background-color: #409eff;
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  line-height: 1.2;
  margin: 0;
  border: none;
  flex-shrink: 0;
}

/* 入库弹窗样式 */
.popup-container {
  width: 80%;
  max-width: 300px;
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
.popup-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
}
.popup-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.popup-item .label {
  width: 70px;
  font-size: 14px;
  color: #333;
}
.popup-item .input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
}
.picker-date {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  background-color: #f9f9f9;
  text-align: center;
}
.popup-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}
.popup-buttons button {
  width: 100px;
  font-size: 14px;
}
.cancel-btn {
  background-color: #f0f0f0;
  color: #666;
}
.confirm-btn {
  background-color: #409eff;
  color: #fff;
}
</style>