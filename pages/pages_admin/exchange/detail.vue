<template>
  <view class="container">
    <uni-load-more v-if="loading" status="loading" />
    <view v-else-if="error" class="error">{{ error.message }}</view>
    <view v-else-if="data" class="detail-card">
      <!-- 基本信息卡片 -->
      <uni-card title="基本信息" :is-shadow="true" margin="10px 0">
        <uni-list>
          <uni-list-item title="物品名称" :right-text="data.name" />
          <uni-list-item title="所需积分" :right-text="(data.points_required / 100).toFixed(2)" />
          <uni-list-item title="库存数量" :right-text="String(data.stock)" />
          <uni-list-item title="描述" :right-text="data.description || '无'" />
        </uni-list>
      </uni-card>

      <!-- 图片卡片 -->
      <uni-card title="物品图片" :is-shadow="true" margin="10px 0">
        <view class="image-container" v-if="data.image">
          <image class="detail-image" :src="data.image" mode="aspectFill" @click="previewImage(data.image)" />
        </view>
        <view v-else class="no-image">暂无图片</view>
      </uni-card>

      <!-- 状态卡片 -->
      <uni-card title="状态" :is-shadow="true" margin="10px 0">
        <view class="custom-list">
          <view class="list-item">
            <text class="item-label">状态</text>
            <view class="status-badge" :class="data.status === 0 ? 'active' : 'inactive'">
              <view class="dot"></view>
              <text>{{ data.status === 0 ? '上架' : '下架' }}</text>
            </view>
          </view>
        </view>
      </uni-card>

      <!-- 其他信息卡片 -->
      <uni-card title="其他信息" :is-shadow="true" margin="10px 0">
        <view class="info-list">
          <view class="info-row">
            <text class="info-label">创建时间：</text>
            <text class="info-value">{{ formatDate(data.create_date) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">最后修改时间：</text>
            <text class="info-value">{{ formatDate(data.update_date) }}</text>
          </view>
        </view>
      </uni-card>
    </view>

    <!-- 底部按钮 -->
    <view class="btns">
      <button type="primary" @click="handleUpdate">修改</button>
      <button type="warn" class="btn-delete" @click="handleDelete">删除</button>
    </view>
  </view>
</template>

<script>
const db = uniCloud.database();

export default {
  data() {
    return {
      loading: false,
      error: null,
      data: null,
      _listChannel: null
    };
  },
  onLoad(e) {
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel) {
      this._listChannel = eventChannel;
    }
    this._id = e.id;
    this.loadData();
  },
  methods: {
    formatDate(timestamp) {
      if (!timestamp) return '-';
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    loadData() {
      this.loading = true;
      db.collection('exchange_goods')
        .doc(this._id)
        .get()
        .then(res => {
          this.data = res.data;
        })
        .catch(err => {
          this.error = err;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    previewImage(url) {
      uni.previewImage({ current: url, urls: [url] });
    },
    handleUpdate() {
      uni.navigateTo({
        url: './edit?id=' + this._id,
        events: {
          refreshData: () => {
            this.loadData();
            if (this._listChannel) {
              this._listChannel.emit('refreshData');
            }
          }
        }
      });
    },
    handleDelete() {
      uni.showModal({
        title: '提示',
        content: '确定要删除该物品吗？',
        success: (res) => {
          if (res.confirm) {
            uni.showLoading({ mask: true });
            db.collection('exchange_goods')
              .doc(this._id)
              .remove()
              .then(() => {
                uni.hideLoading();
                uni.showToast({ title: '删除成功', icon: 'success' });
                if (this._listChannel) {
                  this._listChannel.emit('refreshData');
                }
                setTimeout(() => uni.navigateBack(), 300);
              })
              .catch(err => {
                uni.hideLoading();
                uni.showModal({ content: err.message || '删除失败', showCancel: false });
              });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.container {
  padding: 10px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.error {
  color: #dd524d;
  text-align: center;
  padding: 20px;
}
.detail-card {
  margin-bottom: 70px;
}
.image-container {
  display: flex;
  justify-content: center;
  padding: 10px;
}
.detail-image {
  width: 80%;
  height: auto;
  border-radius: 8px;
}
.no-image {
  text-align: center;
  color: #999;
  padding: 20px;
}
.btns {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 10px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  display: flex;
  gap: 10px;
  z-index: 100;
}
.btns button {
  flex: 1;
  margin: 0;
}
.btn-delete {
  background-color: #dd524d;
  color: #fff;
}
.status-badge {
  display: flex;
  align-items: center;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 6px;
}
.active .dot {
  background-color: #19be6b;
}
.inactive .dot {
  background-color: #999;
}
.custom-list {
  padding: 0 10px;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.list-item:last-child {
  border-bottom: none;
}
.item-label {
  font-size: 16px;
  color: #333;
}
.info-list {
  padding: 10px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  color: #666;
  font-size: 14px;
}
.info-value {
  color: #333;
  font-size: 14px;
}
</style>