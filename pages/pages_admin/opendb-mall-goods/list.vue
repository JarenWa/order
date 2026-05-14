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
        <text>设置分类</text>
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
        field="sku,name,remain_count,goods_price,original_price,standard,category,goods_thumb,goods_remark,is_hot,is_new,is_on_sale,is_pre,shelf_life_months,warning_count"
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
                    <text class="sku">货号:{{ item.sku || '-' }}</text>
                    <text class="price-row">
                      <text class="price">¥{{ formatPrice(item.goods_price) }}</text>
                      <text v-if="item.original_price" class="original-price">¥{{ formatPrice(item.original_price) }}</text>
                    </text>
                    <text class="detail">
                      库存:{{ item.remain_count }}
                      <text v-if="item.warning_count != null && item.remain_count <= item.warning_count" class="warn-text">(预警:{{ item.warning_count }})</text>
                      | 规格:{{ item.standard }}
                      | 分类:{{ getCategoryName(item.category) }}
                      | 保质期:{{ item.shelf_life_months != null ? item.shelf_life_months + '个月' : '-' }}
                    </text>
                    <text v-if="item.goods_remark" class="remark">备注:{{ item.goods_remark }}</text>
                    <view class="tags-row">
                      <view class="tags">
                        <text v-if="item.is_hot" class="tag hot">热销</text>
                        <text v-if="item.is_new" class="tag new">新品</text>
                        <text v-if="!item.is_on_sale" class="tag off">下架</text>
                        <text v-if="item.is_pre" class="tag pre">预售</text>
                      </view>
                      <view class="action-btns">
                        <button class="action-btn inbound" size="mini" @click.stop="openFlowDialog(item, 'inbound')">入库</button>
                        <button class="action-btn check" size="mini" @click.stop="openFlowDialog(item, 'check')">盘点</button>
                        <button class="action-btn adjust" size="mini" @click.stop="openFlowDialog(item, 'adjust')">调整</button>
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
          {{ flowType === 'inbound' ? '商品入库' : flowType === 'check' ? '库存盘点' : '库存调整' }}
        </view>

        <view class="popup-goods-info">
          <text class="popup-goods-name">{{ flowGoods.name }}</text>
          <text class="popup-goods-sku">货号: {{ flowGoods.sku }}</text>
          <text class="popup-goods-stock">当前库存: {{ flowGoods.remain_count }}</text>
        </view>

        <!-- 入库表单 -->
        <block v-if="flowType === 'inbound'">
          <view class="popup-item">
            <text class="label required">入库数量</text>
            <input class="input" type="number" v-model="flowForm.quantity" placeholder="请输入数量" />
          </view>
          <view class="popup-item">
            <text class="label">生产日期</text>
            <picker mode="date" fields="month" :value="flowForm.production_date" @change="onFlowDateChange">
              <view class="picker-date">{{ flowForm.production_date || '请选择年月' }}</view>
            </picker>
          </view>
          <view class="popup-item">
            <text class="label">成本单价(元)</text>
            <input class="input" type="digit" v-model="flowForm.unit_cost_yuan" placeholder="可选" />
          </view>
          <view class="popup-item">
            <text class="label">批次号</text>
            <input class="input" v-model="flowForm.batch_no" placeholder="不填自动生成" />
          </view>
        </block>

        <!-- 盘点表单 -->
        <block v-if="flowType === 'check'">
          <view class="popup-item">
            <text class="label required">实际库存</text>
            <input class="input" type="number" v-model="flowForm.quantity" placeholder="请输入实际库存数量" />
          </view>
        </block>

        <!-- 调整表单 -->
        <block v-if="flowType === 'adjust'">
          <view class="popup-item">
            <text class="label required">调整方式</text>
            <view class="radio-group">
              <view class="radio-item" :class="{ active: flowForm.adjustType === 'add' }" @click="flowForm.adjustType = 'add'">
                <text>增加</text>
              </view>
              <view class="radio-item" :class="{ active: flowForm.adjustType === 'sub' }" @click="flowForm.adjustType = 'sub'">
                <text>减少</text>
              </view>
            </view>
          </view>
          <view class="popup-item">
            <text class="label required">调整数量</text>
            <input class="input" type="number" v-model="flowForm.quantity" placeholder="请输入数量" />
          </view>
        </block>

        <!-- 公共备注 -->
        <view class="popup-item">
          <text class="label">备注</text>
          <input class="input" v-model="flowForm.remark" placeholder="可选" />
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
      flowType: '', // 'inbound' | 'check' | 'adjust'
      flowGoods: {},
      flowForm: {
        quantity: '',
        production_date: '',
        unit_cost_yuan: '',
        batch_no: '',
        adjustType: 'add',
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
        payload.quantity = quantity;
        if (this.flowForm.production_date) payload.production_date = this.flowForm.production_date;
        if (this.flowForm.unit_cost_yuan) {
          payload.unit_cost = Math.round(parseFloat(this.flowForm.unit_cost_yuan) * 100);
        }
        if (this.flowForm.batch_no) payload.batch_no = this.flowForm.batch_no;
      } else if (this.flowType === 'check') {
        payload.quantity = quantity;
      } else if (this.flowType === 'adjust') {
        const sign = this.flowForm.adjustType === 'sub' ? -1 : 1;
        payload.quantity = sign * quantity;
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
  flex: 0.85;
  overflow-y: auto;
  background-color: #f5f5f5;
}
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
  gap: 10px;
}
.category-filter-row button {
  flex-shrink: 0;
}
.category-picker {
  flex: 1;
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
.price {
  font-size: 16px;
  color: #ff6000;
  font-weight: bold;
  margin-right: 6px;
}
.original-price {
  font-size: 13px;
  color: #999;
  text-decoration: line-through;
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
.pre { background-color: #9c27b0; }
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
.action-btn.check { background-color: #ff9800; }
.action-btn.adjust { background-color: #2196f3; }
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
.popup-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.popup-item .label {
  width: 80px;
  font-size: 14px;
  color: #333;
  flex-shrink: 0;
}
.popup-item .label.required::before {
  content: '* ';
  color: #f44336;
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
.radio-group {
  flex: 1;
  display: flex;
  gap: 10px;
}
.radio-item {
  flex: 1;
  text-align: center;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}
.radio-item.active {
  border-color: #007aff;
  background: #e6f2ff;
  color: #007aff;
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
