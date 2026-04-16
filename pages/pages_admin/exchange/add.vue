<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validate-trigger="submit" err-show-type="toast">
      <uni-forms-item name="name" label="物品名称" required>
        <uni-easyinput placeholder="物品名称" v-model="formData.name" trim="both" />
      </uni-forms-item>
	  <uni-forms-item name="standard" label="物品规格" >
	    <uni-easyinput placeholder="物品规格" v-model="formData.standard" trim="both" />
	  </uni-forms-item>
      <uni-forms-item name="points_required" label="所需积分" required>
        <uni-easyinput placeholder="请输入积分，如100" type="number" v-model="formData.points_required" />
      </uni-forms-item>
      <uni-forms-item name="stock" label="库存数量" required>
        <uni-easyinput placeholder="库存数量" type="number" v-model="formData.stock" />
      </uni-forms-item>
      <uni-forms-item name="image" label="物品图片" >
        <uni-file-picker
          file-mediatype="image"
          mode="grid"
          :limit="1"
          title="上传物品图片"
          @success="handleImageSuccess"
          @fail="handleUploadFail"
          @delete="handleImageDelete"
        />
      </uni-forms-item>
      <uni-forms-item name="description" label="物品描述">
        <uni-easyinput placeholder="物品描述" v-model="formData.description" trim="both" type="textarea" />
      </uni-forms-item>
      <uni-forms-item name="status" label="状态">
        <switch @change="binddata('status', $event.detail.value ? 0 : 1)" :checked="formData.status === 0" />
        <text class="status-text">{{ formData.status === 0 ? '上架' : '下架' }}</text>
      </uni-forms-item>

      <view class="uni-button-group">
        <button type="primary" class="uni-button" @click="submit">提交</button>
      </view>
    </uni-forms>
  </view>
</template>

<script>
const db = uniCloud.database();
const dbCollectionName = 'exchange_goods';

export default {
  data() {
    return {
      formData: {
        name: '',
		standard:'',
        points_required: '', // 前端输入所需积分，存储*100
        stock: '',
        image: '', // 存储图片URL或fileID
        description: '',
        status: 0
      }
    };
  },
  methods: {
    handleImageSuccess(e) {
      // 取第一张成功上传的图片
      const file = e.tempFiles[0];
      if (file && (file.url || file.fileID)) {
        this.formData.image = file.url || file.fileID;
      } else {
        uni.showToast({ title: '图片上传失败', icon: 'none' });
      }
    },
    handleImageDelete() {
      this.formData.image = '';
    },
    handleUploadFail(e) {
      console.error('上传失败', e);
      uni.showToast({ title: '图片上传失败', icon: 'none' });
    },
    binddata(key, value) {
      this.formData[key] = value;
    },
    async submit() {
      // 表单验证（简单验证，可自行扩展）
      if (!this.formData.name) {
        uni.showToast({ title: '请输入物品名称', icon: 'none' });
        return;
      }
      if (!this.formData.points_required) {
        uni.showToast({ title: '请输入所需积分', icon: 'none' });
        return;
      }
      if (!this.formData.stock) {
        uni.showToast({ title: '请输入库存数量', icon: 'none' });
        return;
      }

      // 积分转换：前端输入可能是小数，存储为整数（*100）
      const points = parseFloat(this.formData.points_required);
      if (isNaN(points) || points <= 0) {
        uni.showToast({ title: '积分必须为正数', icon: 'none' });
        return;
      }
      const pointsInt = Math.round(points * 100); // 转换为分

      const stockInt = parseInt(this.formData.stock);
      if (isNaN(stockInt) || stockInt < 0) {
        uni.showToast({ title: '库存必须为非负整数', icon: 'none' });
        return;
      }

      // 准备提交的数据（不包含 _id, create_date，让数据库自动生成）
      const dataToSubmit = {
        name: this.formData.name,
		standard: this.formData.standard,
        points_required: pointsInt,
        stock: stockInt,
        image: this.formData.image,
        description: this.formData.description || '',
        status: this.formData.status,
        update_date: Date.now() // 如果 schema 中定义了 update_date，可以手动添加
        // create_date 不传，由数据库自动填充
      };

      uni.showLoading({ mask: true });
      try {
        await db.collection(dbCollectionName).add(dataToSubmit);
        uni.hideLoading();
        uni.showToast({ title: '新增成功', icon: 'success' });
        // 触发上一页刷新
        const eventChannel = this.getOpenerEventChannel();
        if (eventChannel) {
          eventChannel.emit('refreshData');
        }
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (err) {
        uni.hideLoading();
        console.error('提交失败', err);
        uni.showModal({ content: err.message || '提交失败', showCancel: false });
      }
    }
  }
};
</script>

<style scoped>
.uni-container {
  padding: 15px;
}
.uni-button-group {
  margin-top: 50px;
  display: flex;
  justify-content: center;
}
.uni-button {
  width: 184px;
}
.status-text {
  margin-left: 10px;
  font-size: 14px;
  color: #666;
}
</style>