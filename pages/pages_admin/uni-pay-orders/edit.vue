<template>
  <view class="edit-order-container">
    <!-- 地址选择 -->
    <view class="address-section" @click="selectAddress">
      <text class="section-label">收货地址</text>
      <view v-if="selectedAddress" class="address-info">
        <text class="name">{{ selectedAddress.name }}</text>
        <text class="mobile">{{ selectedAddress.mobile }}</text>
        <text class="address">{{ selectedAddress.formatted_address || formatAddress(selectedAddress) }}</text>
      </view>
      <view v-else class="address-empty">请选择收货地址</view>
      <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
    </view>

    <!-- 备注 -->
    <view class="remark-section">
      <text class="section-label">备注</text>
      <textarea v-model="remark" placeholder="选填：备注信息" maxlength="200" />
    </view>

    <!-- 提交按钮 -->
    <button class="submit-btn" type="primary" @click="submitEdit">保存修改</button>
  </view>
</template>

<script>
const db = uniCloud.database();

export default {
  data() {
    return {
      orderId: '',
      originalOrder: null,
      selectedAddress: null,
      remark: '',
    };
  },
  onLoad(options) {
    if (!options.id) {
      uni.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1500);
      return;
    }
    this.orderId = options.id;
    this.loadOrderDetail();
  },
  methods: {
    async loadOrderDetail() {
      uni.showLoading({ title: '加载中...' });
      try {
        const res = await db.collection('uni-pay-orders').doc(this.orderId).get();
        const order = res.result.data[0];
        if (!order) {
          uni.showToast({ title: '订单不存在', icon: 'none' });
          setTimeout(() => uni.navigateBack(), 1500);
          return;
        }
        if (order.status !== 0) {
          uni.showToast({ title: '当前状态不可修改', icon: 'none' });
          setTimeout(() => uni.navigateBack(), 1500);
          return;
        }
        this.originalOrder = order;
        this.remark = order.remark || '';
        // 根据订单中的地址信息，可以尝试从地址表中匹配，但简单起见，不预选地址
      } catch (err) {
        console.error('加载订单失败', err);
        uni.showToast({ title: '加载失败', icon: 'none' });
        setTimeout(() => uni.navigateBack(), 1500);
      } finally {
        uni.hideLoading();
      }
    },
    formatAddress(addr) {
      return [addr.province_name, addr.city_name, addr.district_name, addr.street_name, addr.address].filter(v => v).join(' ');
    },
    selectAddress() {
      uni.navigateTo({
        url: '/pages/address/select?selectMode=true',
        events: {
          onSelectAddress: (addr) => {
            this.selectedAddress = addr;
          }
        }
      });
    },
    async submitEdit() {
      if (!this.selectedAddress) {
        uni.showToast({ title: '请选择收货地址', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '保存中...' });
      try {
        const updateData = {
          consignee: this.selectedAddress.name,
          mobile: this.selectedAddress.mobile,
          address: this.selectedAddress.formatted_address || this.formatAddress(this.selectedAddress),
          remark: this.remark,
          admin_modified: true,
          update_date: Date.now()
        };
        await db.collection('uni-pay-orders').doc(this.orderId).update(updateData);
        uni.hideLoading();
        uni.showToast({ title: '修改成功', icon: 'success' });
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit('refreshData');
        setTimeout(() => uni.navigateBack(), 500);
      } catch (err) {
        uni.hideLoading();
        console.error('修改订单失败', err);
        uni.showModal({ content: err.message || '保存失败', showCancel: false });
      }
    }
  }
};
</script>

<style scoped>
.edit-order-container { padding: 20px; background-color: #f5f5f5; min-height: 100vh; }
.section-label { font-size: 14px; color: #333; margin-bottom: 8px; display: block; }
.address-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
.address-info { flex: 1; display: flex; flex-direction: column; margin-right: 10px; }
.name { font-weight: bold; }
.mobile { color: #666; margin-left: 8px; }
.address { font-size: 14px; color: #999; margin-top: 5px; }
.address-empty { color: #999; }
.remark-section { background-color: #fff; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
textarea { width: 100%; min-height: 80px; border: 1px solid #ddd; border-radius: 6px; padding: 8px; font-size: 14px; margin-top: 8px; box-sizing: border-box; }
.submit-btn { width: 100%; height: 44px; line-height: 44px; border-radius: 22px; background-color: #007aff; }
</style>