<template>
  <view class="app-container">
    <!-- 地址列表 -->
    <unicloud-db
      ref="udb"
      v-slot:default="{ data, loading, error }"
      collection="uni-id-address"
      :where="{ user_id: userInfo._id }"
      orderby="is_default desc, create_date desc"
    >
      <view v-if="error" class="app-error">{{ error.message }}</view>
      <view v-else-if="loading" class="app-loading">加载中...</view>
      <view v-else-if="data && data.length > 0" class="address-list">
        <view
          v-for="item in data"
          :key="item._id"
          class="app-card address-item"
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
      <view v-else class="app-empty">暂无收货地址，请先新增</view>
    </unicloud-db>

    <!-- 新增地址按钮 -->
    <view class="add-btn-wrapper">
      <button class="app-btn app-btn-primary" type="primary" @click="addAddress">+ 新增地址</button>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatAddress } from '@/utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      userInfo: store.userInfo,
    };
  },
  onLoad() {
    if (!this.userInfo || !this.userInfo._id) {
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' });
    }
  },
  methods: {
    formatAddress,
    selectAddress(addr) {
      const eventChannel = this.getOpenerEventChannel();
      eventChannel.emit('onSelectAddress', addr);
      uni.navigateBack();
    },
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
.address-list {
  margin-bottom: 20px;
}
.address-item {
  padding: 12px;
  margin-bottom: 10px;
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
.add-btn-wrapper {
  margin-top: 20px;
  padding: 0 12px;
}
</style>