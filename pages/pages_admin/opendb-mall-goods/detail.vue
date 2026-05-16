<template>
  <view class="container">
    <uni-load-more v-if="loading" status="loading" />
    <view v-else-if="error" class="error">{{ error.message }}</view>
    <view v-else-if="data" class="detail-card">
		<!-- 批次库存卡片 -->
		<uni-card :is-shadow="true" margin="10px 0">
		  <view class="batch-card-header">
		    <text class="batch-card-title">批次库存明细</text>
		    <button class="batch-add-btn" size="mini" @click="openNewBatchPopup">新增批次</button>
		  </view>
		  <view v-if="batchList.length === 0" class="no-batch">暂无入库库存</view>
		  <view v-else class="batch-list">
		    <view class="batch-header">
		      <text class="batch-col">生产日期</text>
		      <text class="batch-col">剩余数量</text>
		      <text class="batch-col">批次号</text>
		      <text class="batch-col">操作</text>
		    </view>
		    <view v-for="(batch, idx) in batchList" :key="idx" class="batch-row">
		      <text class="batch-col">{{ batch.production_date || '-' }}</text>
		      <text class="batch-col">{{ batch.remain_qty }}</text>
		      <text class="batch-col batch-no">{{ batch.batch_no }}</text>
		      <view class="batch-col">
		        <button class="batch-adjust-btn" size="mini" @click="openBatchAdjust(batch)">调整</button>
		      </view>
		    </view>
		  </view>
		</uni-card>
      <!-- 基本信息卡片 -->
      <uni-card title="基本信息" :is-shadow="true" margin="10px 0">
        <uni-list>
          <uni-list-item title="货号(SKU)" :right-text="data.sku || '-'" />
          <uni-list-item title="商品名称" :right-text="data.name" />
          <uni-list-item title="库存数量" :right-text="String(data.remain_count) + (data.warning_count != null && data.remain_count <= data.warning_count ? ' (预警)' : '')" />
          <uni-list-item title="预占库存" :right-text="String(data.locked_count || 0)" />
          <uni-list-item title="售价(元)" :right-text="formatPrice(data.goods_price)" />
          <uni-list-item v-if="data.original_price" title="原价(元)" :right-text="formatPrice(data.original_price)" />
          <uni-list-item title="商品规格" :right-text="data.standard || '无'" />
          <uni-list-item title="商品简介" :right-text="data.goods_desc || '无'" />
          <uni-list-item v-if="data.goods_remark" title="商品备注" :right-text="data.goods_remark" />
          <uni-list-item title="商品类别" :right-text="getCategoryName(data.category)" />
          <uni-list-item v-if="data.shelf_life_months != null" title="保质期" :right-text="data.shelf_life_months + '个月'" />
          <uni-list-item v-if="data.current_production_date" title="当前生产日期" :right-text="data.current_production_date" />
          <uni-list-item title="排序权重" :right-text="String(data.sort_weight || 0)" />
        </uni-list>
      </uni-card>

      <!-- SKU 条形码 -->
      <uni-card v-if="barcodeUrl" title="条形码(EAN13)" :is-shadow="true" margin="10px 0">
        <view class="barcode-wrap">
          <image class="barcode-img" :src="barcodeUrl" mode="widthFix" @click="previewBarcode" />
          <text class="barcode-text">{{ ean13Code }}</text>
        </view>
      </uni-card>

      <!-- 缩略图 -->
      <uni-card title="缩略图" :is-shadow="true" margin="10px 0">
        <view class="image-grid">
          <image v-if="data.goods_thumb" class="grid-image" :src="extractImageUrl(data.goods_thumb)" mode="aspectFill" @click="previewImage([extractImageUrl(data.goods_thumb)], 0)" />
          <view v-else class="no-image">暂无缩略图</view>
        </view>
      </uni-card>

      <!-- 轮播图卡片 -->
      <uni-card title="轮播图" :is-shadow="true" margin="10px 0">
        <view class="image-grid">
          <block v-for="(img, index) in formatImages(data.goods_swiper_imgs)" :key="index">
            <image
              class="grid-image"
              :src="img"
              mode="aspectFill"
              @click="previewImage(formatImages(data.goods_swiper_imgs), index)"
            />
          </block>
          <view v-if="!formatImages(data.goods_swiper_imgs).length" class="no-image">暂无图片</view>
        </view>
      </uni-card>

      <!-- 状态卡片 -->
      <uni-card title="状态" :is-shadow="true" margin="10px 0">
        <view class="custom-list">
          <view class="list-item">
            <text class="item-label">是否热销</text>
            <view class="status-badge" :class="data.is_hot ? 'active' : 'inactive'">
              <view class="dot"></view>
              <text>{{ data.is_hot ? '是' : '否' }}</text>
            </view>
          </view>
          <view class="list-item">
            <text class="item-label">是否新品</text>
            <view class="status-badge" :class="data.is_new ? 'active' : 'inactive'">
              <view class="dot"></view>
              <text>{{ data.is_new ? '是' : '否' }}</text>
            </view>
          </view>
          <view class="list-item">
            <text class="item-label">是否上架</text>
            <view class="status-badge" :class="data.is_on_sale ? 'active' : 'inactive'">
              <view class="dot"></view>
              <text>{{ data.is_on_sale ? '是' : '否' }}</text>
            </view>
          </view>
          <view class="list-item">
            <text class="item-label">是否预售</text>
            <view class="status-badge" :class="data.is_pre ? 'active' : 'inactive'">
              <view class="dot"></view>
              <text>{{ data.is_pre ? '是' : '否' }}</text>
            </view>
          </view>
        </view>
      </uni-card>

      

      <!-- 其他信息卡片 -->
      <uni-card title="其他信息" :is-shadow="true" margin="10px 0">
        <view class="info-list">
          <view class="info-row">
            <text class="info-label">累计销量：</text>
            <text class="info-value">{{ data.total_sold || 0 }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">累计入库：</text>
            <text class="info-value">{{ data.total_inbound || 0 }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">预警阈值：</text>
            <text class="info-value">{{ data.warning_count != null ? data.warning_count : '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">创建时间：</text>
            <text class="info-value">{{ formatDate(data.created_at) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">最后修改时间：</text>
            <text class="info-value">{{ formatDate(data.updated_at) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">操作员：</text>
            <text class="info-value">{{ data.operater || '未知' }}</text>
          </view>
        </view>
      </uni-card>
    </view>

    <!-- 底部按钮 -->
    <view class="btns">
      <button type="primary" @click="handleUpdate">修改</button>
      <button type="warn" class="btn-delete" @click="handleDelete">删除</button>
    </view>

    <!-- 新增批次弹窗 -->
    <uni-popup ref="newBatchPopup" type="center" :mask-click="false">
      <view class="popup-container">
        <view class="popup-title">新增批次</view>
        <view class="popup-form-item">
          <text class="popup-label required">生产日期</text>
          <picker mode="date" fields="month" :value="newBatchForm.production_date" @change="onNewBatchDateChange">
            <view class="popup-picker">{{ newBatchForm.production_date || '请选择年月' }}</view>
          </picker>
        </view>
        <view class="popup-form-item">
          <text class="popup-label required">入库数量</text>
          <input class="popup-input" type="number" v-model="newBatchForm.quantity" placeholder="请输入数量" />
        </view>
        <view class="popup-buttons">
          <button class="popup-btn cancel" @click="closeNewBatchPopup">取消</button>
          <button class="popup-btn confirm" type="primary" @click="confirmNewBatch">确定</button>
        </view>
      </view>
    </uni-popup>

    <!-- 批次调整弹窗 -->
    <uni-popup ref="batchAdjustPopup" type="center" :mask-click="false">
      <view class="popup-container">
        <view class="popup-title">调整批次库存</view>
        <view class="popup-form-item">
          <text class="popup-label">生产日期</text>
          <text class="popup-value">{{ adjustBatchForm.production_date || '-' }}</text>
        </view>
        <view class="popup-form-item">
          <text class="popup-label">当前库存</text>
          <text class="popup-value">{{ adjustBatchForm.currentQty }}</text>
        </view>
        <view class="popup-form-item">
          <text class="popup-label required">调整方式</text>
          <view class="popup-radio-group">
            <view class="popup-radio" :class="{ active: adjustBatchForm.adjustType === 'add' }" @click="adjustBatchForm.adjustType = 'add'">增加</view>
            <view class="popup-radio" :class="{ active: adjustBatchForm.adjustType === 'sub' }" @click="adjustBatchForm.adjustType = 'sub'">减少</view>
          </view>
        </view>
        <view class="popup-form-item">
          <text class="popup-label required">调整数量</text>
          <input class="popup-input" type="number" v-model="adjustBatchForm.quantity" placeholder="请输入数量" />
        </view>
        <view class="popup-buttons">
          <button class="popup-btn cancel" @click="closeBatchAdjustPopup">取消</button>
          <button class="popup-btn confirm" type="primary" @click="confirmBatchAdjust">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { enumConverter } from '../../../js_sdk/validator/opendb-mall-goods.js'
import { formatPrice, formatDate, extractImageUrl, getEAN13BarcodeUrl, formatEAN13 } from '../../../utils/common.js'
const db = uniCloud.database()

export default {
  data() {
    return {
      loading: false,
      error: null,
      data: null,
      batchList: [],
      _listChannel: null,
      categoryMap: {},
      barcodeUrl: '',
      ean13Code: '',
      newBatchForm: {
        production_date: '',
        quantity: ''
      },
      adjustBatchForm: {
        batchId: '',
        production_date: '',
        currentQty: 0,
        adjustType: 'add',
        quantity: ''
      }
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
    formatDate,
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
      Promise.all([
        db.collection('goods').doc(this._id).get(),
        db.collection('goods_stock_batch')
          .where({ product_id: this._id, remain_qty: db.command.gt(0) })
          .orderBy('production_date', 'asc')
          .get()
      ])
        .then(([goodsRes, batchRes]) => {
          this.data = goodsRes.result.data[0]
          this.batchList = batchRes.result.data || []
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
    formatImages(imgs) {
      if (!imgs || !Array.isArray(imgs)) return []
      return imgs.map(item => extractImageUrl(item)).filter(Boolean)
    },
    previewImage(urls, index) {
      uni.previewImage({ current: index, urls })
    },
    previewBarcode() {
      if (this.barcodeUrl) {
        uni.previewImage({ urls: [this.barcodeUrl] })
      }
    },
    handleUpdate() {
      uni.navigateTo({
        url: '../opendb-mall-goods/edit?id=' + this._id,
        events: {
          refreshData: () => {
            this.loadData()
            if (this._listChannel) {
              this._listChannel.emit('refreshData')
            }
          }
        }
      })
    },
    handleDelete() {
      uni.showModal({
        title: '提示',
        content: '确定要删除该商品吗？',
        success: (res) => {
          if (res.confirm) {
            uni.showLoading({ mask: true })
            db.collection('goods')
              .doc(this._id)
              .remove()
              .then(() => {
                uni.hideLoading()
                uni.showToast({ title: '删除成功', icon: 'success' })
                if (this._listChannel) {
                  this._listChannel.emit('refreshData')
                }
                setTimeout(() => uni.navigateBack(), 300)
              })
              .catch(err => {
                uni.hideLoading()
                uni.showModal({ content: err.message || '删除失败', showCancel: false })
              })
          }
        }
      })
    },
    openNewBatchPopup() {
      this.newBatchForm = { production_date: '', quantity: '' }
      this.$refs.newBatchPopup.open()
    },
    closeNewBatchPopup() {
      this.$refs.newBatchPopup.close()
    },
    onNewBatchDateChange(e) {
      this.newBatchForm.production_date = e.detail.value
    },
    async confirmNewBatch() {
      const qty = parseInt(this.newBatchForm.quantity, 10)
      if (isNaN(qty) || qty <= 0) {
        uni.showToast({ title: '请输入有效数量', icon: 'none' })
        return
      }
      if (!this.newBatchForm.production_date) {
        uni.showToast({ title: '请选择生产日期', icon: 'none' })
        return
      }
      const existed = this.batchList.find(b => b.production_date === this.newBatchForm.production_date)
      if (existed) {
        uni.showToast({ title: '该生产日期批次已存在，请使用调整功能', icon: 'none' })
        return
      }
      uni.showLoading({ title: '处理中...', mask: true })
      try {
        const stockCo = uniCloud.importObject('stock-co')
        await stockCo.change({
          product_id: this._id,
          type: 'inbound',
          quantity: qty,
          production_date: this.newBatchForm.production_date
        })
        uni.showToast({ title: '新增成功', icon: 'success' })
        this.closeNewBatchPopup()
        this.loadData()
      } catch (err) {
        console.error('新增批次失败', err)
        uni.showModal({ content: err.message || '操作失败', showCancel: false })
      } finally {
        uni.hideLoading()
      }
    },
    openBatchAdjust(batch) {
      this.adjustBatchForm = {
        batchId: batch._id,
        production_date: batch.production_date || '-',
        currentQty: batch.remain_qty,
        adjustType: 'add',
        quantity: ''
      }
      this.$refs.batchAdjustPopup.open()
    },
    closeBatchAdjustPopup() {
      this.$refs.batchAdjustPopup.close()
    },
    async confirmBatchAdjust() {
      const qty = parseInt(this.adjustBatchForm.quantity, 10)
      if (isNaN(qty) || qty <= 0) {
        uni.showToast({ title: '请输入有效数量', icon: 'none' })
        return
      }
      const delta = this.adjustBatchForm.adjustType === 'sub' ? -qty : qty
      uni.showLoading({ title: '处理中...', mask: true })
      try {
        const stockCo = uniCloud.importObject('stock-co')
        await stockCo.adjustBatch({
          batch_id: this.adjustBatchForm.batchId,
          product_id: this._id,
          delta
        })
        uni.showToast({ title: '调整成功', icon: 'success' })
        this.closeBatchAdjustPopup()
        this.loadData()
      } catch (err) {
        console.error('批次调整失败', err)
        uni.showModal({ content: err.message || '操作失败', showCancel: false })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped>
.container { padding: 10px; background-color: #f5f5f5; min-height: 100vh; }
.error { color: #dd524d; text-align: center; padding: 20px; }
.detail-card { margin-bottom: 70px; }
.image-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; }
.grid-image { width: calc(33.33% - 6px); aspect-ratio: 1 / 1; border-radius: 8px; background-color: #f0f0f0; }
.no-image { width: 100%; text-align: center; color: #999; font-size: 14px; padding: 20px 0; }
.btns { position: fixed; bottom: 0; left: 0; right: 0; background-color: #fff; padding: 10px; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); display: flex; gap: 10px; z-index: 100; }
.btns button { flex: 1; margin: 0; }
.btn-delete { background-color: #dd524d; color: #fff; }
.btn-delete[type='warn'] { background-color: #dd524d; }
.status-badge { display: flex; align-items: center; }
.dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; }
.active .dot { background-color: #19be6b; }
.inactive .dot { background-color: #999; }
.custom-list { padding: 0 10px; }
.list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
.list-item:last-child { border-bottom: none; }
.item-label { font-size: 16px; color: #333; }
.info-list { padding: 10px; }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
.info-row:last-child { border-bottom: none; }
.info-label { color: #666; font-size: 14px; }
.info-value { color: #333; font-size: 14px; }
.no-batch { text-align: center; color: #999; font-size: 14px; padding: 20px 0; }
.batch-list { padding: 0 10px; }
.batch-header { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; font-size: 14px; color: #333; }
.batch-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #666; }
.batch-row:last-child { border-bottom: none; }
.batch-col { flex: 1; text-align: center; }
.batch-no { font-size: 12px; color: #999; }
.barcode-wrap { display: flex; flex-direction: column; align-items: center; padding: 10px; }
.barcode-img { width: 80%; max-width: 300px; height: auto; background-color: #fff; }
.barcode-text { margin-top: 6px; font-size: 14px; color: #666; letter-spacing: 2px; }
.batch-card-header { display: flex; justify-content: space-between; align-items: center; padding: 0 10px; }
.batch-card-title { font-size: 16px; font-weight: bold; }
.batch-add-btn { margin: 0; font-size: 12px; background-color: #4caf50; color: #fff; border-radius: 12px; padding: 2px 10px; line-height: 1.6; }
.batch-adjust-btn { margin: 0; font-size: 11px; background-color: #2196f3; color: #fff; border-radius: 10px; padding: 2px 8px; line-height: 1.6; }
.popup-container { width: 80%; max-width: 320px; background-color: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
.popup-title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 16px; }
.popup-form-item { display: flex; align-items: center; margin-bottom: 12px; }
.popup-label { width: 80px; font-size: 14px; color: #333; }
.popup-label.required::after { content: '*'; color: #dd524d; margin-left: 2px; }
.popup-picker { flex: 1; font-size: 14px; color: #666; padding: 8px; border: 1px solid #e5e5e5; border-radius: 5px; }
.popup-input { flex: 1; font-size: 14px; padding: 8px; border: 1px solid #e5e5e5; border-radius: 5px; }
.popup-value { flex: 1; font-size: 14px; color: #666; }
.popup-radio-group { flex: 1; display: flex; gap: 10px; }
.popup-radio { flex: 1; text-align: center; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
.popup-radio.active { border-color: #007aff; background: #e6f2ff; color: #007aff; }
.popup-buttons { display: flex; justify-content: space-around; margin-top: 20px; }
.popup-btn { width: 100px; font-size: 14px; }
.popup-btn.cancel { background-color: #f0f0f0; color: #666; }
.popup-btn.confirm { background-color: #409eff; color: #fff; }
</style>
