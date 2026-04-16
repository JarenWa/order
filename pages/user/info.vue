<template>
  <view class="user-info-container">
    <!-- 个人信息卡片（点击跳转到官方个人资料页） -->
    <view class="profile-card" @click="goToUserInfo">
      <image class="avatar" :src="avatarUrl" mode="aspectFill"></image>
      <view class="profile-text">
        <text class="nickname">{{ userInfo.nickname || '未设置昵称' }}</text>
        <text class="phone">{{ userInfo.mobile || '未绑定手机号[!请点击绑定]' }}</text>
      </view>
      <uni-icons type="arrowright" size="20" color="#999"></uni-icons>
    </view>


    <!-- 地址管理 -->
    <view class="address-section">
      <view class="section-header">
        <text class="section-title">收货地址</text>
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
        <view v-if="error" class="error">{{ error.message }}</view>
        <view v-else-if="loading" class="loading">加载中...</view>
        <view v-else-if="data && data.length > 0" class="address-list">
          <view
            v-for="item in data"
            :key="item._id"
            class="address-item"
            :class="{ default: item.is_default }"
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
            <view class="address-actions">
              <uni-icons type="compose" size="20" color="#666" @click="editAddress(item._id)"></uni-icons>
              <uni-icons type="trash" size="20" color="#666" @click="deleteAddress(item._id)"></uni-icons>
            </view>
          </view>
        </view>
        <view v-else class="empty-address">暂无收货地址，点击上方新增</view>
      </unicloud-db>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';

export default {
  data() {
    return {
      userInfo: store.userInfo, // 从官方 store 获取用户信息
    };
  },
  onShow() {
    // 每次显示页面刷新地址列表（例如从新增/编辑页面返回）
    this.$refs.udb && this.$refs.udb.loadData({ clear: true });
  },
   computed: {
      addressWhere() {
        if (!this.userInfo || !this.userInfo._id) return null;
        return { user_id: this.userInfo._id };
      },
	  avatarUrl() {
	      const user = this.userInfo || {};
	      // 兼容 avatar_file 和 avatarFile 两种命名
	      return user.avatar_file?.url || user.avatarFile?.url ;
	    }
    },
  methods: {
    // 跳转到官方个人资料页（包含头像、昵称、手机绑定、密码修改等）
    goToUserInfo() {
      uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo'
      });
    },
    // 新增地址
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
    // 编辑地址
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
    // 删除地址
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
   
    // 格式化完整地址（如果后台没有存储 formatted_address，可临时拼接）
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
    onAddressLoad(data) {
      console.log('地址列表加载', data);
    }
  }
};
</script>

<style scoped>
.user-info-container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding: 12px;
}
.profile-card {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.avatar {
  width: 60px;
  height: 60px;
  border-radius: 30px;
  margin-right: 12px;
  background-color: #f0f0f0;
}
.profile-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.nickname {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}
.phone {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}
.address-section {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
.add-btn {
  font-size: 14px;
  color: #007aff;
}
.address-list {
  margin-top: 8px;
}
.address-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.address-item:last-child {
  border-bottom: none;
}
.address-item.default {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 12px 8px;
  margin: 0 -8px;
}
.address-info {
  flex: 1;
  cursor: pointer;
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
  color: #666;
  line-height: 1.4;
}
.address-actions {
  display: flex;
  gap: 12px;
  margin-left: 10px;
}
.empty-address {
  text-align: center;
  color: #999;
  padding: 20px 0;
  font-size: 14px;
}
.error, .loading {
  text-align: center;
  padding: 20px;
  color: #999;
}
</style>