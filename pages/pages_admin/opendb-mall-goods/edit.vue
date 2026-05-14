<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validate-trigger="submit" err-show-type="toast">
      <uni-forms-item name="sku" label="货号(SKU)" required>
        <uni-easyinput placeholder="商品货号，用于扫码入库" v-model="formData.sku" trim="both" />
      </uni-forms-item>
      <uni-forms-item name="name" label="名称" required>
        <uni-easyinput placeholder="商品名称" v-model="formData.name" trim="both" />
      </uni-forms-item>
      <uni-forms-item name="remain_count" label="库存数量" required>
        <uni-easyinput placeholder="库存数量" type="number" v-model="formData.remain_count" />
      </uni-forms-item>
      <uni-forms-item name="priceYuan" label="售价(元)" required>
        <uni-easyinput placeholder="请输入价格，如29.90" type="digit" v-model="formData.priceYuan" @blur="formatPrice" />
      </uni-forms-item>
      <uni-forms-item name="originalPriceYuan" label="原价(元)">
        <uni-easyinput placeholder="划线原价，可不填" type="digit" v-model="formData.originalPriceYuan" @blur="formatOriginalPrice" />
      </uni-forms-item>
      <uni-forms-item name="standard" label="商品规格" required>
        <uni-easyinput placeholder="商品规格" v-model="formData.standard" trim="both" />
      </uni-forms-item>
      <uni-forms-item label="商品类别" name="category">
        <uni-data-select v-model="formData.category" :localdata="categoryOptions" placeholder="请选择商品类别" />
      </uni-forms-item>
      <uni-forms-item name="shelf_life_months" label="保质期(月)">
        <uni-easyinput placeholder="请输入月份数" type="number" v-model="formData.shelf_life_months" @blur="formatShelfLife" />
      </uni-forms-item>
      <uni-forms-item name="warning_count" label="库存预警阈值">
        <uni-easyinput placeholder="低于此值标红提醒" type="number" v-model="formData.warning_count" />
      </uni-forms-item>
      <uni-forms-item name="sort_weight" label="排序权重">
        <uni-easyinput placeholder="越大越靠前" type="number" v-model="formData.sort_weight" />
      </uni-forms-item>
      <uni-forms-item name="goods_desc" label="商品简介">
        <uni-easyinput placeholder="商品简短描述" v-model="formData.goods_desc" trim="both" />
      </uni-forms-item>
      <uni-forms-item name="goods_remark" label="商品备注">
        <uni-easyinput placeholder="商品备注信息" v-model="formData.goods_remark" trim="both" />
      </uni-forms-item>

      <uni-forms-item name="goods_thumb" label="缩略图">
        <uni-file-picker
          v-model="formData.goods_thumb_file"
          file-mediatype="image"
          mode="grid"
          :limit="1"
          title="上传1张缩略图"
          @success="handleThumbSuccess"
          @fail="handleUploadFail"
          @delete="handleThumbDelete"
        />
      </uni-forms-item>

      <uni-forms-item name="goods_swiper_imgs" label="详情轮播图">
        <uni-file-picker
          v-model="formData.goods_swiper_imgs"
          file-mediatype="image"
          mode="grid"
          :limit="5"
          title="最多上传5张"
          @success="handleSwiperSuccess"
          @fail="handleUploadFail"
          @delete="handleSwiperDelete"
        />
      </uni-forms-item>

      <uni-forms-item name="is_hot" label="是否热销">
        <switch @change="binddata('is_hot', $event.detail.value)" :checked="formData.is_hot" />
      </uni-forms-item>
      <uni-forms-item name="is_new" label="是否新品">
        <switch @change="binddata('is_new', $event.detail.value)" :checked="formData.is_new" />
      </uni-forms-item>
      <uni-forms-item name="is_on_sale" label="是否上架">
        <switch @change="binddata('is_on_sale', $event.detail.value)" :checked="formData.is_on_sale" />
      </uni-forms-item>
      <uni-forms-item name="is_pre" label="是否预售">
        <switch @change="binddata('is_pre', $event.detail.value)" :checked="formData.is_pre" />
      </uni-forms-item>
      <uni-forms-item name="operater" label="操作员">
        <uni-easyinput placeholder="操作员" v-model="formData.operater" />
      </uni-forms-item>

      <view class="uni-button-group">
        <button type="primary" class="uni-button" @click="submit">提交</button>
      </view>
    </uni-forms>
  </view>
</template>

<script>
import { validator } from '../../../js_sdk/validator/opendb-mall-goods.js'

const db = uniCloud.database()
const dbCollectionName = 'goods'

function getValidator(fields) {
  let result = {}
  for (let key in validator) {
    if (fields.indexOf(key) > -1) {
      result[key] = validator[key]
    }
  }
  return result
}

export default {
  data() {
    let formData = {
      sku: '',
      name: '',
      remain_count: 999,
      goods_price: null,
      priceYuan: '',
      original_price: null,
      originalPriceYuan: '',
      goods_desc: '',
      goods_remark: '',
      standard: '',
      category: '',
      shelf_life_months: null,
      goods_thumb: '',
      goods_thumb_file: [],
      goods_swiper_imgs: [],
      is_hot: false,
      is_new: false,
      is_on_sale: true,
      is_pre: false,
      warning_count: 10,
      sort_weight: 0,
      operater: ''
    }
    return {
      formData,
      formOptions: {},
      categoryOptions: [],
      rules: {
        ...getValidator(Object.keys(formData)),
        priceYuan: {
          rules: [
            { required: true, errorMessage: '请输入价格' },
            { pattern: /^\d+(\.\d{0,2})?$/, errorMessage: '价格最多两位小数' }
          ]
        },
        originalPriceYuan: {
          rules: [
            { pattern: /^\d+(\.\d{0,2})?$/, errorMessage: '价格最多两位小数' }
          ]
        },
        shelf_life_months: {
          rules: [{ pattern: /^[1-9]\d*$/, errorMessage: '请输入正整数' }]
        },
        goods_swiper_imgs: { rules: [] },
        goods_thumb_file: { rules: [] }
      }
    }
  },
  onLoad(e) {
    if (e.id) {
      this.formDataId = e.id
      this.getDetail(e.id)
    }
    this.loadCategories()
  },
  onReady() {
    this.$refs.form.setRules(this.rules)
  },
  methods: {
    formatPrice() {
      if (this.formData.priceYuan) {
        let yuan = parseFloat(this.formData.priceYuan)
        if (!isNaN(yuan)) {
          this.formData.goods_price = Math.round(yuan * 100)
          this.formData.priceYuan = yuan.toFixed(2)
        } else {
          this.formData.goods_price = null
        }
      } else {
        this.formData.goods_price = null
      }
    },
    formatOriginalPrice() {
      if (this.formData.originalPriceYuan) {
        let yuan = parseFloat(this.formData.originalPriceYuan)
        if (!isNaN(yuan)) {
          this.formData.original_price = Math.round(yuan * 100)
          this.formData.originalPriceYuan = yuan.toFixed(2)
        } else {
          this.formData.original_price = null
        }
      } else {
        this.formData.original_price = null
      }
    },
    formatShelfLife() {
      if (this.formData.shelf_life_months) {
        let val = parseInt(this.formData.shelf_life_months, 10)
        if (!isNaN(val) && val > 0) {
          this.formData.shelf_life_months = val
        } else {
          this.formData.shelf_life_months = null
        }
      }
    },
    handleThumbSuccess(e) {
      const validFiles = e.tempFiles.filter(file => file.url || file.fileID)
      if (validFiles.length > 0) {
        this.formData.goods_thumb = validFiles[0].url || validFiles[0].fileID
      }
    },
    handleThumbDelete() {
      this.formData.goods_thumb = ''
      this.formData.goods_thumb_file = []
    },
    handleSwiperSuccess(e) {
      console.log('轮播图上传成功', e.tempFiles)
    },
    handleSwiperDelete(e) {
      console.log('轮播图删除', e.tempFile)
    },
    handleUploadFail(e) {
      console.error('上传失败', e)
      uni.showToast({ title: '图片上传失败', icon: 'none' })
    },
    async loadCategories() {
      const db = uniCloud.databaseForJQL()
      const res = await db.collection('opendb-mall-categories').field('_id, name').get()
      this.categoryOptions = res.data.map(item => ({
        value: item._id,
        text: item.name
      }))
    },
    getDetail(id) {
      uni.showLoading({ mask: true })
      db.collection(dbCollectionName)
        .doc(id)
        .field('sku,name,remain_count,goods_price,original_price,goods_desc,goods_remark,standard,category,shelf_life_months,goods_swiper_imgs,goods_thumb,is_hot,is_new,is_on_sale,is_pre,warning_count,sort_weight,operater')
        .get()
        .then(res => {
          const data = res.result.data[0]
          if (data) {
            this.formData = Object.assign(this.formData, data)
            if (this.formData.goods_price) {
              this.formData.priceYuan = (this.formData.goods_price / 100).toFixed(2)
            }
            if (this.formData.original_price) {
              this.formData.originalPriceYuan = (this.formData.original_price / 100).toFixed(2)
            }
            if (this.formData.goods_swiper_imgs && typeof this.formData.goods_swiper_imgs[0] === 'string') {
              this.formData.goods_swiper_imgs = this.formData.goods_swiper_imgs.map(url => ({ url }))
            }
            if (this.formData.goods_thumb) {
              this.formData.goods_thumb_file = [{ url: this.formData.goods_thumb }]
            }
          }
        })
        .catch(err => {
          uni.showModal({ content: err.message || '请求服务失败', showCancel: false })
        })
        .finally(() => {
          uni.hideLoading()
        })
    },
    submit() {
      this.formatPrice()
      this.formatOriginalPrice()
      if (this.formData.remain_count !== undefined && this.formData.remain_count !== null) {
        this.formData.remain_count = parseInt(this.formData.remain_count, 10)
        if (isNaN(this.formData.remain_count)) {
          uni.showModal({ content: '库存数量必须为整数', showCancel: false })
          return
        }
      }
      if (this.formData.warning_count != null) {
        this.formData.warning_count = parseInt(this.formData.warning_count, 10)
      }
      if (this.formData.sort_weight != null) {
        this.formData.sort_weight = parseInt(this.formData.sort_weight, 10)
      }

      uni.showLoading({ mask: true })
      this.$refs.form
        .validate()
        .then(() => {
          const { _id, priceYuan, originalPriceYuan, goods_thumb_file, ...dataToSubmit } = this.formData

          dataToSubmit.updated_at = Date.now()

          dataToSubmit.goods_swiper_imgs = (dataToSubmit.goods_swiper_imgs || [])
            .map(item => item.url || item.fileID || item)
            .filter(v => v)

          if (!dataToSubmit.goods_thumb && dataToSubmit.goods_swiper_imgs.length > 0) {
            dataToSubmit.goods_thumb = dataToSubmit.goods_swiper_imgs[0]
          }

          return db.collection(dbCollectionName).doc(this.formDataId).update(dataToSubmit)
        })
        .then(res => {
          uni.hideLoading()
          uni.showToast({ icon: 'none', title: '修改成功' })
          this.getOpenerEventChannel().emit('refreshData')
          setTimeout(() => uni.navigateBack(), 500)
        })
        .catch(err => {
          uni.hideLoading()
          console.error('提交失败', err)
          uni.showModal({ content: err.message || '提交失败', showCancel: false })
        })
    }
  }
}
</script>

<style>
.uni-container { padding: 15px; }
.uni-input-border, .uni-textarea-border { width: 100%; font-size: 14px; color: #666; border: 1px #e5e5e5 solid; border-radius: 5px; box-sizing: border-box; }
.uni-input-border { padding: 0 10px; height: 35px; }
.uni-textarea-border { padding: 10px; height: 80px; }
.uni-button-group { margin-top: 50px; display: flex; justify-content: center; }
.uni-button { width: 184px; }
</style>