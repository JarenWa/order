<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" :rules="rules" validate-trigger="submit" err-show-type="toast">
      <uni-forms-item label="物品名称" name="name" required>
        <uni-easyinput placeholder="请输入名称" v-model="formData.name" trim="both" />
      </uni-forms-item>
	  
	  <uni-forms-item label="物品规格" name="standard" >
	    <uni-easyinput placeholder="请输入规格" v-model="formData.standard" trim="both" />
	  </uni-forms-item>

      <uni-forms-item label="所需积分" name="points_required" required>
        <uni-easyinput placeholder="例如：100" type="number" v-model="formData.points_required" @blur="formatPoints" />
      </uni-forms-item>

      <uni-forms-item label="库存数量" name="stock" required>
        <uni-easyinput placeholder="库存数量" type="number" v-model="formData.stock" />
      </uni-forms-item>

      <uni-forms-item label="图片" name="image" >
        <uni-file-picker
          v-model="fileList"
          file-mediatype="image"
          mode="grid"
          :limit="1"
          title="最多上传1张"
          @success="handleImageSuccess"
          @delete="handleImageDelete"
        />
        <!-- 可选：额外预览，但 file-picker 会自动显示，此条可删 -->
      </uni-forms-item>

      <uni-forms-item label="描述" name="description">
        <textarea class="textarea" v-model="formData.description" placeholder="物品描述" />
      </uni-forms-item>

      <uni-forms-item label="状态" name="status">
        <radio-group @change="onStatusChange">
          <label><radio value="0" :checked="formData.status === 0" /> 上架</label>
          <label><radio value="1" :checked="formData.status === 1" /> 下架</label>
        </radio-group>
      </uni-forms-item>

      <view class="uni-button-group">
        <button type="primary" class="uni-button" @click="submit">提交</button>
      </view>
    </uni-forms>
  </view>
</template>

<script>
const db = uniCloud.database();
const collectionName = 'exchange_goods';

export default {
  data() {
    return {
      id: '',
      formData: {
        name: '',
		standard: '',
        points_required: '',
        stock: '',
        image: '',
        description: '',
        status: 0
      },
      fileList: [], // 用于 file-picker 显示已有图片
      rules: {
        name: { rules: [{ required: true, errorMessage: '请输入物品名称' }] },
		standard: { rules: [{ errorMessage: '请输入规格' }] },
        points_required: { rules: [{ required: true, errorMessage: '请输入所需积分' }] },
        stock: { rules: [{ required: true, errorMessage: '请输入库存' }] },
        image: { rules: [{ errorMessage: '请上传图片' }] }
      }
    };
  },
  onLoad(option) {
    if (option.id) {
      this.id = option.id;
      this.loadData();
    }
  },
  methods: {
    async loadData() {
      uni.showLoading({ title: '加载中' });
      try {
        const res = await db.collection(collectionName).doc(this.id).get();
        // 注意：客户端返回的数据结构为 res.result.data 数组，取第一个元素
        const item = res.result.data[0];
        if (item) {
          this.formData = {
            name: item.name,
			standard: item.standard,
            points_required: (item.points_required / 100).toFixed(2),
            stock: item.stock,
            image: item.image,
            description: item.description || '',
            status: item.status
          };
          // 为 file-picker 设置初始文件列表（显示已有图片）
          if (item.image) {
            this.fileList = [{ url: item.image }];
          }
        }
      } catch (err) {
        console.error(err);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    formatPoints() {
      if (this.formData.points_required) {
        let val = parseFloat(this.formData.points_required);
        if (!isNaN(val) && val > 0) {
          this.formData.points_required = val.toFixed(2);
        }
      }
    },
    onStatusChange(e) {
      this.formData.status = parseInt(e.detail.value);
    },
    handleImageSuccess(e) {
      // 上传成功后，更新 formData.image 和 fileList
      const file = e.tempFiles[0];
      if (file && (file.url || file.fileID)) {
        const imageUrl = file.url || file.fileID;
        this.formData.image = imageUrl;
        this.fileList = [{ url: imageUrl }];
      }
    },
    handleImageDelete() {
      // 删除图片时清空
      this.formData.image = '';
      this.fileList = [];
    },
    async submit() {
      const valid = await this.$refs.form.validate();
      if (!valid) return;

      // 积分转换：用户输入的小数 → 整数（分）
      const pointsInt = Math.round(parseFloat(this.formData.points_required) * 100);
      const data = {
        name: this.formData.name.trim(),
		standard: this.formData.standard || '',
        points_required: pointsInt,
        stock: parseInt(this.formData.stock, 10),
        image: this.formData.image,
        description: this.formData.description || '',
        status: this.formData.status,
        update_date: Date.now()
      };

      uni.showLoading({ title: '保存中' });
      try {
        await db.collection(collectionName).doc(this.id).update(data);
        uni.hideLoading();
        uni.showToast({ title: '修改成功', icon: 'success' });
        // 触发上一页刷新
        const eventChannel = this.getOpenerEventChannel();
        if (eventChannel) {
          eventChannel.emit('refreshData');
        }
        setTimeout(() => uni.navigateBack(), 1500);
      } catch (err) {
        uni.hideLoading();
        console.error('提交失败', err);
        uni.showToast({ title: err.message || '提交失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.uni-container { padding: 15px; }
.textarea {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 12px;
  height: 100px;
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