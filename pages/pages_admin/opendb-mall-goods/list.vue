<template>
  <view class="page-container">
    <!-- 顶部工具栏：第一行（状态筛选 + 搜索） -->
    <view class="app-admin-toolbar">
      <view class="filter-menu">
        <picker @change="onStatusFilterChange" :value="statusIndex" :range="statusOptions">
          <view class="app-admin-picker">
            {{ statusOptions[statusIndex] }}
            <text class="uni-icon app-admin-picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="app-admin-search-box">
        <input
          class="app-admin-search-input"
          type="text"
          v-model="searchInput"
          placeholder="输入商品名称"
          confirm-type="search"
          @confirm="onSearch"
        />
        <button class="app-admin-search-btn" type="default" size="mini" @click="onSearch">搜索</button>
      </view>
    </view>

    <!-- 第二行：类别筛选菜单 -->
    <view class="app-admin-filter-row">
      <button type="default" size="mini" @click="setCategory">
        <text>设置分类</text>
      </button>
      <picker @change="onCategoryFilterChange" :value="categoryIndex" :range="categoryOptions" range-key="text">
        <view class="app-admin-picker category-picker">
          {{ categoryOptions[categoryIndex].text }}
          <text class="uni-icon app-admin-picker-arrow">▼</text>
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
        field="sku,name,remain_count,goods_price,original_price,standard,category,goods_thumb,goods_remark,is_hot,is_new,is_on_sale,is_pre,shelf_life_months,warning_count,current_production_date"
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
                    class="app-goods-image"
                    :src="getImageSrc(item)"
                    @error="onImageError(item)"
                    mode="aspectFill"
                  />
                  <view class="app-goods-info">
                    <text class="name">{{ item.name }}</text>
                    <text class="sku">货号:{{ item.sku || '-' }}</text>
                    <text class="price-row">
                      <text class="app-text-price">¥{{ formatPrice(item.goods_price) }}</text>
                      <text v-if="item.original_price" class="app-original-price">¥{{ formatPrice(item.original_price) }}</text>
                    </text>
                    <text class="detail">
                      库存:{{ item.remain_count }}
                      <text v-if="item.warning_count != null && item.remain_count <= item.warning_count" class="warn-text">(预警:{{ item.warning_count }})</text>
                      | 规格:{{ item.standard }}
                      | 分类:{{ getCategoryName(item.category) }}
                      | 保质期:{{ item.shelf_life_months != null ? item.shelf_life_months + '个月' : '-' }}
                      <text v-if="item.current_production_date"> | 生产日期:{{ item.current_production_date }}</text>
                    </text>
                    <text v-if="item.goods_remark" class="remark">备注:{{ item.goods_remark }}</text>
                    <view class="tags-row">
                      <view class="tags">
                        <text v-if="item.is_hot" class="app-tag app-tag-hot">热销</text>
                        <text v-if="item.is_new" class="app-tag app-tag-new">新品</text>
                        <text v-if="!item.is_on_sale" class="app-tag app-tag-off">下架</text>
                        <text v-if="item.is_pre" class="app-tag app-tag-pre">预售</text>
                      </view>
                      <view class="action-btns">
                        <button class="action-btn inbound" size="mini" @click.stop="openFlowDialog(item, 'inbound')">入库</button>
                      </view>
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

    <!-- 悬浮按钮 -->
    <uni-fab ref="fab" horizontal="right" vertical="bottom" :pop-menu="false" @fabClick="fabClick" />

    <!-- 库存操作统一弹窗 -->
    <uni-popup ref="flowPopup" type="center" :mask-click="false">
      <view class="popup-container">
        <view class="popup-title">
          商品入库
        </view>

        <view class="popup-goods-info">
          <text class="popup-goods-name">{{ flowGoods.name }}</text>
          <text class="popup-goods-sku">货号: {{ flowGoods.sku }}</text>
          <text class="popup-goods-stock">当前库存: {{ flowGoods.remain_count }}</text>
        </view>

        <!-- 入库表单 -->
        <view class="app-popup-form-item">
          <text class="app-popup-form-label app-popup-form-label-required">入库数量</text>
          <input class="app-popup-form-input" type="number" v-model="flowForm.quantity" placeholder="请输入数量" />
        </view>
        <view class="app-popup-form-item app-popup-form-label-required">
          <text class="app-popup-form-label">生产日期</text>
          <picker mode="date" fields="month" :value="flowForm.production_date" @change="onFlowDateChange">
            <view class="app-popup-form-picker">{{ flowForm.production_date || '请选择年月' }}</view>
          </picker>
        </view>
        <view class="app-popup-form-item">
          <text class="app-popup-form-label">成本单价(元)</text>
          <input class="app-popup-form-input" type="digit" v-model="flowForm.unit_cost_yuan" placeholder="可选" />
        </view>
        <view class="app-popup-form-item">
          <text class="app-popup-form-label">批次号</text>
          <input class="app-popup-form-input" v-model="flowForm.batch_no" placeholder="不填自动生成" />
        </view>

        <!-- 公共备注 -->
        <view class="app-popup-form-item">
          <text class="app-popup-form-label">备注</text>
          <input class="app-popup-form-input" v-model="flowForm.remark" placeholder="可选" />
        </view>

        <view class="popup-buttons">
          <button class="cancel-btn" @click="closeFlowDialog">取消</button>
          <button class="confirm-btn" type="primary" @click="confirmFlow">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { formatPrice, getGoodsImage, onImageError } from '../../../utils/common.js';

export default {
  data() {
    return {
      refreshKey: 0,
      collectionList: 'goods',
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
      // 库存操作弹窗数据
      flowType: '',
      flowGoods: {},
      flowForm: {
        quantity: '',
        production_date: '',
        unit_cost_yuan: '',
        batch_no: '',
        remark: ''
      }
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
  methods: {
    formatPrice,
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
            this.loadAllCategories();
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
      this.searchInput = '';
      this.searchText = '';
      this.statusIndex = e.detail.value;
      const types = ['all', 'hot', 'new', 'off', 'pre'];
      this.statusType = types[this.statusIndex];
      this.refreshKey++;
      this.$nextTick(() => {
        this.$refs.udb && this.$refs.udb.loadData({ clear: true });
      });
    },
    onCategoryFilterChange(e) {
      this.searchInput = '';
      this.searchText = '';
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
      return getGoodsImage(item);
    },
    onImageError,
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
    openFlowDialog(item, type) {
      this.flowType = type;
      this.flowGoods = { ...item };
      this.flowForm = {
        quantity: '',
        production_date: '',
        unit_cost_yuan: '',
        batch_no: '',
        adjustType: 'add',
        remark: ''
      };
      this.$refs.flowPopup.open();
    },
    closeFlowDialog() {
      this.$refs.flowPopup.close();
      this.flowGoods = {};
      this.flowType = '';
    },
    onFlowDateChange(e) {
      this.flowForm.production_date = e.detail.value;
    },
    async confirmFlow() {
      const quantity = parseInt(this.flowForm.quantity, 10);
      if (isNaN(quantity) || quantity < 0) {
        uni.showToast({ title: '请输入有效数量', icon: 'none' });
        return;
      }

      let payload = {
        product_id: this.flowGoods._id,
        type: this.flowType,
        remark: this.flowForm.remark
      };

      if (this.flowType === 'inbound') {
        if (!this.flowForm.production_date) {
          uni.showToast({ title: '请选择生产日期', icon: 'none' });
          return;
        }
        payload.quantity = quantity;
        payload.production_date = this.flowForm.production_date;
        if (this.flowForm.unit_cost_yuan) {
          payload.unit_cost = Math.round(parseFloat(this.flowForm.unit_cost_yuan) * 100);
        }
        if (this.flowForm.batch_no) payload.batch_no = this.flowForm.batch_no;
      }

      uni.showLoading({ title: '处理中...', mask: true });
      try {
        const stockCo = uniCloud.importObject('stock-co');
        await stockCo.change(payload);
        uni.showToast({ title: '操作成功', icon: 'success' });
        this.closeFlowDialog();
        this.$refs.udb && this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        console.error('库存操作失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      } finally {
        uni.hideLoading();
      }
    }
  }
};
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.list-scroll {
  flex: 1;
  overflow-y: auto;
  background-color: #f5f5f5;
}
.filter-menu {
  flex-shrink: 0;
  margin-right: 10px;
  font-size: 16px;
}
.category-picker {
  flex: 1;
  justify-content: center;
  font-size: 16px;
}
.item-content {
  display: flex;
  align-items: flex-start;
  width: 100%;
}
.name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 2px;
  color: #333;
}
.sku {
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}
.price-row {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
}
.detail {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
  line-height: 1.4;
}
.warn-text {
  color: #f44336;
  font-weight: bold;
}
.remark {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
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
.action-btns {
  display: flex;
  gap: 6px;
}
.action-btn {
  margin: 0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  border: none;
  color: #fff;
  line-height: 1.6;
}
.action-btn.inbound { background-color: #4caf50; }
.popup-container {
  width: 80%;
  max-width: 320px;
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
.popup-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 16px;
}
.popup-goods-info {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 16px;
}
.popup-goods-name {
  font-weight: bold;
  font-size: 14px;
  display: block;
}
.popup-goods-sku,
.popup-goods-stock {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  display: block;
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
