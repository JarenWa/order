<template>
 
  <scroll-view
    class="list-scroll"
    scroll-y
    refresher-enabled
    @refresherrefresh="onRefresh"
    @scrolltolower="loadMore"
    :refresher-triggered="refreshing"
  >
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

    <!-- 数据列表（unicloud-db 仅负责数据加载，不直接处理下拉刷新和上拉加载） -->
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, hasMore, error }"
      :collection="collectionList"
      :page-size="20"
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
                  <view class="tags">
                    <text v-if="item.is_hot" class="tag hot">热销</text>
                    <text v-if="item.is_new" class="tag new">新品</text>
                    <text v-if="!item.is_on_sale" class="tag off">下架</text>
					<text v-if="item.is_pre" class="tag pre">预售</text>
                  </view>
                </view>
              </view>
            </template>
          </uni-list-item>
        </uni-list>
      </view>
      <uni-load-more :status="loading ? 'loading' : (hasMore ? 'more' : 'noMore')" />
    </unicloud-db>

    <!-- 新增按钮（悬浮）放在 scroll-view 内，因为 scroll-view 占满全屏，需确保定位正确，这里保持原样放在最后，但会被滚动 -->
    <uni-fab ref="fab" horizontal="right" vertical="bottom" :pop-menu="false" @fabClick="fabClick" />
  </scroll-view>
</template>

<script>
export default {
  data() {
    return {
      collectionList: 'opendb-mall-goods',
      // 搜索
      searchInput: '',
      searchText: '',
      // 状态筛选
      statusOptions: ['全部标签', '热销', '新品', '下架', '预售'],
      statusIndex: 0,
      statusType: 'all',
      // 类别筛选
      categoryOptions: [{ value: '', text: '全部分类' }],
      categoryIndex: 0,
      categoryValue: '',
      // 分类映射
      categoryMap: {},
      // 下拉刷新状态
      refreshing: false,
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
    // 组件创建时加载分类映射和首次数据
    this.loadAllCategories().then(() => {
      this.$nextTick(() => {
        this.$refs.udb && this.$refs.udb.loadData();
      });
    });
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
          // 构建分类映射
          res.data.forEach(cat => {
            this.categoryMap[cat._id] = cat.name;
          });
          // 构建类别筛选菜单
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

    // 根据分类ID获取名称
    getCategoryName(catId) {
      if (!catId) return '-';
      return this.categoryMap[catId] || '-';
    },

    // 状态筛选变更
    onStatusFilterChange(e) {
      this.statusIndex = e.detail.value;
      const types = ['all', 'hot', 'new', 'off','pre'];
      this.statusType = types[this.statusIndex];
      // 筛选条件变化后重新加载数据（自动触发，因为 whereCondition 变化，unicloud-db 会重新查询）
      // 但需要手动调用 loadData 确保立即刷新
      this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },

    // 类别筛选变更
    onCategoryFilterChange(e) {
      this.categoryIndex = e.detail.value;
      this.categoryValue = this.categoryOptions[this.categoryIndex].value;
      this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },

    // 搜索
    onSearch() {
      this.searchText = this.searchInput;
      this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },

    // 下拉刷新
    onRefresh() {
      this.refreshing = true;
      this.$refs.udb.loadData({ clear: true }, () => {
        this.refreshing = false;
      });
    },

    // 上拉加载更多
    loadMore() {
      this.$refs.udb.loadMore();
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
    }
  }
};
</script>

<style scoped>
/* 确保 scroll-view 占满父容器高度 */
.list-scroll {
  height: 100%;
  background-color: #f8f8f8;
}

/* 工具栏样式（与原有保持一致） */
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

/* 第二行：类别筛选 */
.category-filter-row {
  margin: 0 10px 10px;
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
.hot { background-color: #f37b1d; }
.new { background-color: #4caf50; }
.off { background-color: #999; }
.pre { background-color: #999; }
</style>