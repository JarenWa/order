<template>
  <view class="app-container-no-padding">
    <!-- 个人信息卡片 -->
    <view class="app-card user-header" @click="goToUserInfo">
      <image class="app-avatar" :src="avatarUrl" mode="aspectFill"></image>
      <view class="app-user-info">
        <text class="app-nickname">{{ userInfo.nickname || '未设置昵称' }}</text>
        <text class="app-phone">{{ userInfo.mobile || '未绑定手机号[!请点击绑定]' }}</text>
      </view>
      <uni-icons type="arrowright" size="20" color="#999"></uni-icons>
    </view>

    <!-- 地址管理 -->
    <view class="app-card address-section">
      <view class="section-header">
        <text class="app-section-title">收货地址</text>
        <text class="add-btn" @click="addAddress">+ 新增</text>
      </view>

      <unicloud-db
        ref="udb"
        v-slot:default="{ data, loading, error }"
        collection="uni-id-address"
        :where="addressWhere"
        orderby="is_default desc, create_date desc"
        @load="onAddressLoad"
      >
        <view v-if="error" class="app-error">{{ error.message }}</view>
        <view v-else-if="loading" class="app-loading">加载中...</view>
        <view v-else-if="data && data.length > 0" class="address-list">
          <view
            v-for="item in data"
            :key="item._id"
            class="app-address-item"
            :class="{ 'app-address-item-default': item.is_default }"
          >
            <view class="app-address-info">
              <view class="app-address-name-tag">
                <text class="name">{{ item.name }}</text>
                <text class="app-address-tag" v-if="item.alias">{{ item.alias }}</text>
                <text class="app-address-default-badge" v-if="item.is_default">默认</text>
              </view>
              <text class="address-phone">{{ item.mobile }}</text>
              <text class="full-address">{{ item.formatted_address || formatAddress(item) }}</text>
            </view>
            <view class="app-address-actions">
              <uni-icons type="compose" size="20" color="#666" @click="editAddress(item._id)"></uni-icons>
              <uni-icons type="trash" size="20" color="#666" @click="deleteAddress(item._id)"></uni-icons>
            </view>
          </view>
        </view>
        <view v-else class="app-empty">暂无收货地址，点击上方新增</view>
      </unicloud-db>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
import { formatAddress } from '@/utils/common.js';

export default {
  data() {
    return {
      userInfo: store.userInfo,
    };
  },
  onShow() {
    this.$refs.udb && this.$refs.udb.loadData({ clear: true });
  },
  computed: {
    addressWhere() {
      if (!this.userInfo || !this.userInfo._id) return null;
      return { user_id: this.userInfo._id };
    },
    avatarUrl() {
      const user = this.userInfo || {};
      return user.avatar_file?.url || user.avatarFile?.url;
    }
  },
  methods: {
    formatAddress,
    goToUserInfo() {
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo' });
    },
    addAddress() {
      uni.navigateTo({
        url: '../address/add',
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    editAddress(id) {
      uni.navigateTo({
        url: `../address/edit?id=${id}`,
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    deleteAddress(id) {
      uni.showModal({
        title: '提示',
        content: '确定要删除该地址吗？',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '删除中' });
            try {
              const db = uniCloud.database();
              await db.collection('uni-id-address').doc(id).remove();
              uni.hideLoading();
              uni.showToast({ title: '删除成功', icon: 'success' });
              this.$refs.udb && this.$refs.udb.loadData({ clear: true });
            } catch (err) {
              uni.hideLoading();
              uni.showModal({ content: err.message || '删除失败', showCancel: false });
            }
          }
        }
      });
    },
    onAddressLoad(data) {
      console.log('地址列表加载', data);
    }
  }
};
</script>

<style scoped>
.user-header {
  display: flex;
  align-items: center;
  padding: 16px;
  margin: 12px 12px 0;
}
.address-section {
  padding: 16px;
  margin: 12px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}
.add-btn {
  font-size: 14px;
  color: #007aff;
}
.address-list {
  margin-top: 8px;
}
.name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-right: 8px;
}
.address-phone {
  font-size: 14px;
  color: #666;
  display: block;
  margin-bottom: 4px;
}
.full-address {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}
</style>