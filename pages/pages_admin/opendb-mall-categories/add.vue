<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validate-trigger="submit" err-show-type="toast">
      <uni-forms-item name="name" label="类别名称" required>
        <uni-easyinput placeholder="类别名称" v-model="formData.name" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="sort" label="排序">
        <uni-easyinput 
          placeholder="类别排序，越大越靠后（非负整数）" 
          type="number" 
          v-model="formData.sort"
        ></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="description" label="类别描述">
        <uni-easyinput placeholder="类别描述" v-model="formData.description" trim="both"></uni-easyinput>
      </uni-forms-item>
      <view class="uni-button-group">
        <button type="primary" class="uni-button" @click="submit">提交</button>
      </view>
    </uni-forms>
  </view>
</template>

<script>
  import { validator } from '../../../js_sdk/validator/opendb-mall-categories.js';

  const db = uniCloud.database();
  const dbCollectionName = 'opendb-mall-categories';

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
        "name": "",
        "sort": null,
        "description": ""
      }
      return {
        formData,
        formOptions: {},
        // 合并原有校验规则，并增加sort的正整数限制
        rules: {
          ...getValidator(Object.keys(formData)),
          sort: {
            rules: [
              { required: false, errorMessage: '请输入排序' },
              { pattern: /^\d+$/, errorMessage: '排序必须为非负整数' }
            ]
          }
        }
      }
    },
    onReady() {
      this.$refs.form.setRules(this.rules)
    },
    methods: {
      submit() {
        uni.showLoading({ mask: true })
        this.$refs.form.validate().then((res) => {
          return this.submitForm(res)
        }).catch(() => {
        }).finally(() => {
          uni.hideLoading()
        })
      },
      submitForm(value) {
        // 类型转换：确保 sort 为整数
        if (value.sort !== undefined && value.sort !== null && value.sort !== '') {
          value.sort = parseInt(value.sort, 10);
        } else {
          // 如果用户未输入，移除该字段（数据库将按默认值处理）
          delete value.sort;
        }

        return db.collection(dbCollectionName).add(value).then((res) => {
          uni.showToast({ icon: 'none', title: '新增成功' })
          this.getOpenerEventChannel().emit('refreshData')
          setTimeout(() => uni.navigateBack(), 500)
        }).catch((err) => {
          uni.showModal({ content: err.message || '请求服务失败', showCancel: false })
        })
      }
    }
  }
</script>

<style>
/* 样式保持不变 */
.uni-container { padding: 15px; }
.uni-input-border, .uni-textarea-border {
  width: 100%; font-size: 14px; color: #666;
  border: 1px #e5e5e5 solid; border-radius: 5px; box-sizing: border-box;
}
.uni-input-border { padding: 0 10px; height: 35px; }
.uni-textarea-border { padding: 10px; height: 80px; }
.uni-button-group { margin-top: 50px; display: flex; justify-content: center; }
.uni-button { width: 184px; }
</style>