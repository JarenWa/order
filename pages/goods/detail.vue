<template>
  <view class="app-container">
    <uni-load-more v-if="loading" status="loading" />
    <view v-else-if="error" class="app-error">{{ error.message }}</view>
    <view v-else-if="data" class="app-card-flat detail-card">
      <!-- 基本信息卡片 -->
      <uni-card title="基本信息" :is-shadow="true" margin="10px 0">
        <uni-list>
          <uni-list-item title="商品名称" :right-text="data.name" />
          <uni-list-item title="库存数量" :right-text="String(data.remain_count)" />
          <uni-list-item title="售价(元)" :right-text="formatPrice(data.goods_price)" />
          <uni-list-item
            v-if="data.original_price && data.original_price > data.goods_price"
            title="原价(元)"
            :right-text="formatPrice(data.original_price)"
          />
          <uni-list-item title="商品简介" :right-text="data.goods_desc || '无'" />
          <uni-list-item title="商品规格" :right-text="data.standard || '无'" />
          <uni-list-item title="商品类别" :right-text="getCategoryName(data.category)" />
          <uni-list-item v-if="data.goods_remark" title="商品备注" :right-text="data.goods_remark" />
        </uni-list>
      </uni-card>
	  <!-- SKU 条形码 -->
	  <uni-card v-if="barcodeUrl" title="条形码(EAN13)" :is-shadow="true" margin="10px 0">
	    <view class="barcode-wrap">
	      <image class="barcode-img" :src="barcodeUrl" mode="widthFix" @click="previewBarcode" />
	      <text class="barcode-text">{{ ean13Code }}</text>
	    </view>
	  </uni-card>

      <!-- 轮播图卡片 -->
      <uni-card title="商品图片" :is-shadow="true" margin="10px 0">
        <view class="app-image-grid">
          <block v-for="(img, index) in data.goods_swiper_imgs || []" :key="index">
            <image
              class="app-grid-image"
              :src="extractImageUrl(img)"
              mode="aspectFill"
              @click="previewImage(data.goods_swiper_imgs, index)"
            />
          </block>
          <view v-if="!(data.goods_swiper_imgs && data.goods_swiper_imgs.length)" class="app-empty">暂无图片</view>
        </view>
      </uni-card>

      <!-- 状态卡片 -->
      <uni-card title="状态" :is-shadow="true" margin="10px 0">
        <view class="custom-list">
          <view class="app-list-item">
            <text class="app-list-item-label">是否热销</text>
            <view class="status-badge" :class="data.is_hot ? 'active' : 'inactive'">
              <view class="dot"></view>
              <text>{{ data.is_hot ? '是' : '否' }}</text>
            </view>
          </view>
          <view class="app-list-item">
            <text class="app-list-item-label">是否新品</text>
            <view class="status-badge" :class="data.is_new ? 'active' : 'inactive'">
              <view class="dot"></view>
              <text>{{ data.is_new ? '是' : '否' }}</text>
            </view>
          </view>
          <view class="app-list-item">
            <text class="app-list-item-label">是否预售</text>
            <view class="status-badge" :class="data.is_pre ? 'active' : 'inactive'">
              <view class="dot"></view>
              <text>{{ data.is_pre ? '是' : '否' }}</text>
            </view>
          </view>
        </view>
      </uni-card>
    </view>
  </view>
</template>

<script>
import {  formatPrice, formatDate, extractImageUrl, getEAN13BarcodeUrl, formatEAN13 } from '@/utils/common.js';

const db = uniCloud.database()

export default {
  data() {
    return {
      loading: false,
      error: null,
      data: null,
      _listChannel: null,
      categoryMap: {},
	  barcodeUrl: '',
	  ean13Code: ''
    }
  },
  onLoad(e) {
    const eventChannel = this.getOpenerEventChannel()
    if (eventChannel) {
      this._listChannel = eventChannel
    }
    this._id = e.id
    this.loadData()
    this.loadAllCategories()
  },
  methods: {
    formatPrice,
    extractImageUrl,
    async loadAllCategories() {
      try {
        const dbJql = uniCloud.databaseForJQL()
        const res = await dbJql.collection('opendb-mall-categories')
          .field('_id, name')
          .get()
        if (res && Array.isArray(res.data)) {
          res.data.forEach(cat => {
            this.categoryMap[cat._id] = cat.name
          })
        }
      } catch (err) {
        console.error('加载分类失败', err)
      }
    },
    getCategoryName(catId) {
      if (!catId) return '未分类'
      return this.categoryMap[catId] || '未分类'
    },
    loadData() {
      this.loading = true
      db.collection('goods')
        .doc(this._id)
        .get()
        .then(res => {
          this.data = res.result.data[0]
		  if (this.data && this.data.sku) {
		    this.ean13Code = formatEAN13(this.data.sku) || this.data.sku
		    this.barcodeUrl = getEAN13BarcodeUrl(this.data.sku) || ''
			}
        })
        .catch(err => {
          this.error = err
        })
        .finally(() => {
          this.loading = false
        })
    },
    previewImage(imgs, index) {
      if (!imgs || !imgs.length) return
      const urls = imgs.map(img => extractImageUrl(img))
      uni.previewImage({ current: index, urls })
    },
  }
}
</script>

<style scoped>
.detail-card { margin-bottom: 70px; }
.status-badge { display: flex; align-items: center; }
.dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; }
.active .dot { background-color: #19be6b; }
.inactive .dot { background-color: #999; }
.barcode-wrap { display: flex; flex-direction: column; align-items: center; padding: 10px; }
.barcode-img { width: 80%; max-width: 300px; height: auto; background-color: #fff; }
.barcode-text { margin-top: 6px; font-size: 14px; color: #666; letter-spacing: 2px; }
</style>
