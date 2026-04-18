<template>
  <view class="address-select-container">
    <!-- 地址列表 -->
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="uni-id-address"
      :where="`user_id == '${userInfo._id}'`"
      orderby="is_default desc, create_date desc"
    >
      <view v-if="error" class="error">{{ error.message }}</view>
      <view v-else-if="loading" class="loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="address-list">
        <view
          v-for="item in data"
          :key="item._id"
          class="address-item"
          :class="{ default: item.is_default }"
          @click="selectAddress(item)"
        >
          <view class="address-info">
            <view class="name-tag">
              <text class="name">{{ item.name }}</text>
              <text class="tag" v-if="item.alias">{{ item.alias }}</text>
              <text class="default-badge" v-if="item.is_default">默认</text>
            </view>
            <text class="phone">{{ item.mobile }}</text>
            <text class="full-address">{{ item.formatted_address || formatAddress(item) }}</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-address">暂无收货地址，请先新增</view>
    </unicloud-db>

    <!-- 新增地址按钮 -->
    <view class="add-btn-wrapper">
      <button type="primary" @click="addAddress">+ 新增地址</button>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();

export default {
  data() {
    return {
      userInfo: store.userInfo,
    };
  },
  onLoad() {
    if (!this.userInfo || !this.userInfo._id) {
      uni.navigateTo({ url: '/pages/login/login' });
    }
  },
  methods: {
    // 格式化完整地址（如果数据库没有存储 formatted_address）
    formatAddress(item) {
      const parts = [
        item.province_name,
        item.city_name,
        item.district_name,
        item.street_name,
        item.address
      ].filter(v => v);
      return parts.join(' ');
    },
    // 选择地址，返回给上一页
    selectAddress(addr) {
      const eventChannel = this.getOpenerEventChannel();
      eventChannel.emit('onSelectAddress', addr);
      uni.navigateBack();
    },
    // 新增地址
    addAddress() {
      uni.navigateTo({
        url: '/pages/address/add',
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.address-select-container {
  padding: 12px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.address-list {
  margin-bottom: 20px;
}
.address-item {
  background-color: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid transparent;
}
.address-item.default {
  border-color: #007aff;
  background-color: #f0f9ff;
}
.name-tag {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-right: 8px;
}
.tag {
  font-size: 12px;
  color: #666;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 8px;
}
.default-badge {
  font-size: 12px;
  color: #007aff;
  background-color: #e6f2ff;
  padding: 2px 6px;
  border-radius: 4px;
}
.phone {
  font-size: 14px;
  color: #666;
  display: block;
  margin-bottom: 4px;
}
.full-address {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.empty-address {
  text-align: center;
  color: #999;
  padding: 40px 20px;
  font-size: 14px;
}
.add-btn-wrapper {
  margin-top: 20px;
  padding: 0 12px;
}
.add-btn-wrapper button {
  border-radius: 30px;
}
.error, .loading {
  text-align: center;
  padding: 20px;
  color: #999;
}
</style>