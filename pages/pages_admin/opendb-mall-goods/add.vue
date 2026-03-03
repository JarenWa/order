<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validate-trigger="submit" err-show-type="toast">
      <!-- 基本信息 -->
      <uni-forms-item name="name" label="名称" required>
        <uni-easyinput placeholder="商品名称" v-model="formData.name" trim="both" />
      </uni-forms-item>
      <uni-forms-item name="remain_count" label="库存数量" required>
        <uni-easyinput placeholder="库存数量" type="number" v-model="formData.remain_count" />
      </uni-forms-item>
      <!-- 价格（元） -->
      <uni-forms-item name="priceYuan" label="价格(元)" required>
        <uni-easyinput
          placeholder="请输入价格，如29.90"
          type="digit"
          v-model="formData.priceYuan"
          @blur="formatPrice"
        />
      </uni-forms-item>
      <uni-forms-item name="standard" label="商品规格" required>
        <uni-easyinput placeholder="商品规格" v-model="formData.standard" trim="both" />
      </uni-forms-item>
      <!-- 商品类别 -->
      <uni-forms-item label="商品类别" name="category">
        <uni-data-select v-model="formData.category" :localdata="categoryOptions" placeholder="请选择商品类别" />
      </uni-forms-item>
      <!-- 生产日期 -->
      <uni-forms-item name="production_date" label="生产日期">
        <picker mode="date" fields="month" :value="formData.production_date" @change="onProductionDateChange">
          <view class="uni-input">{{ formData.production_date || '请选择年月' }}</view>
        </picker>
      </uni-forms-item>
      <!-- 保质期（月） -->
      <uni-forms-item name="shelf_life_months" label="保质期(月)">
        <uni-easyinput
          placeholder="请输入月份数"
          type="number"
          v-model="formData.shelf_life_months"
          @blur="formatShelfLife"
        />
      </uni-forms-item>
      <!-- 商品简介 -->
      <uni-forms-item name="goods_desc" label="商品简介">
        <uni-easyinput placeholder="商品简短描述" v-model="formData.goods_desc" trim="both" />
      </uni-forms-item>

      <!-- 轮播图：手动管理，不绑定 v-model -->
      <uni-forms-item name="goods_swiper_imgs" label="详情轮播图">
        <uni-file-picker
          file-mediatype="image"
          mode="grid"
          :limit="5"
          title="最多上传5张"
          @success="handleSwiperSuccess"
          @fail="handleUploadFail"
          @delete="handleSwiperDelete"
        />
      </uni-forms-item>

      <!-- 介绍图：手动管理 -->
      <uni-forms-item name="goods_introduce_imgs" label="详情介绍图">
        <uni-file-picker
          file-mediatype="image"
          mode="grid"
          :limit="5"
          title="最多上传5张"
          @success="handleIntroduceSuccess"
          @fail="handleUploadFail"
          @delete="handleIntroduceDelete"
        />
      </uni-forms-item>

      <!-- 状态开关 -->
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

      <!-- 标签 -->
      <uni-forms-item name="tag" label="商品标签">
        <uni-data-checkbox :multiple="true" v-model="formData.tag" />
      </uni-forms-item>

      <!-- 操作员（可选） -->
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
const dbCollectionName = 'opendb-mall-goods'

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
    const formData = {
      name: '',
      remain_count: 999,
      goods_price: null,        // 存储分
      priceYuan: '',            // 输入元
      goods_desc: '',
      standard: '',
      category: '',
      production_date: '',
      shelf_life_months: null,
      goods_swiper_imgs: [],    // 存储完整文件对象数组
      goods_introduce_imgs: [],
      goods_thumb: '',
      is_hot: null,
      is_new: null,
      is_on_sale: true,
	  is_pre: null,
      tag: [],
      comment_count: 0,
      total_sell_count: 0,
      last_modify_date: null,
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
        production_date: {
          rules: [{ pattern: /^\d{4}-\d{2}$/, errorMessage: '生产日期格式为YYYY-MM' }]
        },
        shelf_life_months: {
          rules: [{ pattern: /^[1-9]\d*$/, errorMessage: '请输入正整数' }]
        },
        goods_swiper_imgs: { rules: [] },
        goods_introduce_imgs: { rules: [] }
      }
    }
  },
  onLoad() {
    this.loadCategories()
  },
  onReady() {
    this.$refs.form.setRules(this.rules)
  },
  methods: {
    // 价格转换：元 → 分
    formatPrice() {
      if (this.formData.priceYuan) {
        const yuan = parseFloat(this.formData.priceYuan)
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

    // 生产日期选择
    onProductionDateChange(e) {
      this.formData.production_date = e.detail.value
    },

    // 保质期输入处理
    formatShelfLife() {
      if (this.formData.shelf_life_months) {
        const val = parseInt(this.formData.shelf_life_months, 10)
        if (!isNaN(val) && val > 0) {
          this.formData.shelf_life_months = val
        } else {
          this.formData.shelf_life_months = null
        }
      }
    },

    // ---------- 轮播图处理 ----------
    handleSwiperSuccess(e) {
      // 过滤出上传成功且包含 url 或 fileID 的完整文件对象
      const validFiles = e.tempFiles.filter(file => file.url || file.fileID)
      if (validFiles.length === 0) {
        uni.showToast({ title: '轮播图上传失败，请重试', icon: 'none' })
        return
      }
      // 直接追加完整对象
      this.formData.goods_swiper_imgs = [
        ...(this.formData.goods_swiper_imgs || []),
        ...validFiles
      ]
    },
    handleSwiperDelete(e) {
      const deleted = e.tempFile
      // 根据 fileID 或 url 删除（对象中两者至少有一个）
      this.formData.goods_swiper_imgs = this.formData.goods_swiper_imgs.filter(
        item => item.fileID !== deleted.fileID && item.url !== (deleted.url || deleted.path)
      )
    },

    // ---------- 介绍图处理 ----------
    handleIntroduceSuccess(e) {
      const validFiles = e.tempFiles.filter(file => file.url || file.fileID)
      if (validFiles.length === 0) {
        uni.showToast({ title: '介绍图上传失败，请重试', icon: 'none' })
        return
      }
      this.formData.goods_introduce_imgs = [
        ...(this.formData.goods_introduce_imgs || []),
        ...validFiles
      ]
    },
    handleIntroduceDelete(e) {
      const deleted = e.tempFile
      this.formData.goods_introduce_imgs = this.formData.goods_introduce_imgs.filter(
        item => item.fileID !== deleted.fileID && item.url !== (deleted.url || deleted.path)
      )
    },

    // 上传失败通用处理
    handleUploadFail(e) {
      console.error('上传失败', e)
      uni.showToast({ title: '图片上传失败', icon: 'none' })
    },

    // 加载分类下拉
    async loadCategories() {
      const db = uniCloud.databaseForJQL()
      const res = await db
        .collection('opendb-mall-categories')
        .field('_id, name')
        .get()
      this.categoryOptions = res.data.map(item => ({
        value: item._id,
        text: item.name
      }))
    },

    // ---------- 提交表单 ----------
    submit() {
      this.formatPrice()

      if (this.formData.remain_count != null) {
        const remain = parseInt(this.formData.remain_count, 10)
        if (isNaN(remain)) {
          uni.showModal({ content: '库存数量必须为整数', showCancel: false })
          return
        }
        this.formData.remain_count = remain
      }

      // 验证图片有效性（确保所有图片都有 url 或 fileID）
      const checkImages = (imgs) => {
        if (!imgs || imgs.length === 0) return true
        return imgs.every(img => img.url || img.fileID)
      }
      if (!checkImages(this.formData.goods_swiper_imgs)) {
        uni.showModal({ content: '部分轮播图未成功上传，请重新上传', showCancel: false })
        return
      }
      if (!checkImages(this.formData.goods_introduce_imgs)) {
        uni.showModal({ content: '部分介绍图未成功上传，请重新上传', showCancel: false })
        return
      }

      uni.showLoading({ mask: true })

      this.$refs.form.validate().then(() => {
        const { priceYuan, ...dataToSubmit } = this.formData

        // 确保布尔值正确
        dataToSubmit.is_hot = dataToSubmit.is_hot === true
        dataToSubmit.is_new = dataToSubmit.is_new === true
        dataToSubmit.is_on_sale = dataToSubmit.is_on_sale !== false

     

        return db.collection(dbCollectionName).add(dataToSubmit)
      })
        .then(res => {
          uni.hideLoading()
          uni.showToast({ title: '新增成功', icon: 'success' })
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
.uni-container {
  padding: 15px;
}
.uni-input-border,
.uni-textarea-border {
  width: 100%;
  font-size: 14px;
  color: #666;
  border: 1px #e5e5e5 solid;
  border-radius: 5px;
  box-sizing: border-box;
}
.uni-input-border {
  padding: 0 10px;
  height: 35px;
}
.uni-textarea-border {
  padding: 10px;
  height: 80px;
}
.uni-button-group {
  margin-top: 50px;
  display: flex;
  justify-content: center;
}
.uni-button {
  width: 184px;
}
</style>