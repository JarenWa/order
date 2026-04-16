<template>
  <view class="edit-order-container">
    <uni-forms ref="form" :model="formData" :rules="rules" validate-trigger="submit">
      <!-- 订单基本信息（只读） -->
      <uni-card title="订单信息" :is-shadow="true" margin="10px 0">
        <uni-list>
          <uni-list-item title="订单号" :right-text="orderInfo.order_no" />
          <uni-list-item title="收货人" :right-text="orderInfo.consignee" />
          <uni-list-item title="联系电话" :right-text="orderInfo.mobile" />
          <uni-list-item title="收货地址" :right-text="orderInfo.address" />
        </uni-list>
      </uni-card>

      <!-- 商品列表编辑区 -->
      <uni-card title="商品明细" :is-shadow="true" margin="10px 0">
        <view v-for="(item, index) in goodsList" :key="index" class="goods-item">
          <view class="goods-header">
            <text class="goods-name">{{ item.name }}</text>
            <text class="goods-standard">{{ item.standard }}</text>
          </view>
          <view class="goods-edit">
            <view class="edit-item">
              <text class="label">原价：¥{{ (item.originalPrice / 100).toFixed(2) }}</text>
              <text class="label">原数量：{{ item.originalCount }}</text>
            </view>
            <view class="edit-item">
              <text class="label">新价格(元)</text>
              <uni-easyinput
                v-model="item.priceYuan"
                type="digit"
                placeholder="价格(元)"
                :inputBorder="false"
                class="price-input"
                @blur="formatPrice(item)"
              />
            </view>
            <view class="edit-item">
              <text class="label">新数量</text>
              <uni-easyinput
                v-model="item.count"
                type="number"
                placeholder="数量"
                :inputBorder="false"
                class="count-input"
                @blur="checkStock(item)"
              />
            </view>
            <button class="delete-btn" size="mini" type="warn" @click="deleteItem(index)">删除</button>
          </view>
        </view>

        <!-- 添加新商品区域 -->
        <!-- <view class="add-goods">
          <view class="add-title">+ 添加新商品</view>
          <view class="add-form">
            <uni-easyinput
              v-model="newGood.good_id"
              placeholder="商品ID"
              :inputBorder="false"
              class="add-input"
            />
            <uni-easyinput
              v-model="newGood.name"
              placeholder="商品名称"
              :inputBorder="false"
              class="add-input"
            />
            <uni-easyinput
              v-model="newGood.standard"
              placeholder="规格"
              :inputBorder="false"
              class="add-input"
            />
            <uni-easyinput
              v-model="newGood.priceYuan"
              type="digit"
              placeholder="价格(元)"
              :inputBorder="false"
              class="add-input"
            />
            <uni-easyinput
              v-model="newGood.count"
              type="number"
              placeholder="数量"
              :inputBorder="false"
              class="add-input"
            />
            <button class="add-btn" size="mini" type="primary" @click="addNewGoods">添加</button>
          </view>
        </view> -->
      </uni-card>

      <!-- 底部提交按钮 -->
      <view class="footer">
        <button type="primary" @click="submitEdit" :loading="submitting">保存修改</button>
      </view>
    </uni-forms>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();

export default {
  data() {
    return {
      orderId: '',
      orderInfo: {},
      goodsList: [], // 每个对象包含 { good_id, name, standard, originalPrice, originalCount, price, count, priceYuan }
      newGood: {
        good_id: '',
        name: '',
        standard: '',
        priceYuan: '',
        count: 1,
      },
      submitting: false,
      rules: {},
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
    // 加载订单详情
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
        this.orderInfo = order;

        this.goodsList = order.goods_list.map(item => ({
          good_id: item.good_id,
          name: item.name,
          standard: item.standard,
          originalPrice: item.price,
          originalCount: item.count,
          price: item.price,
          count: item.count,
          priceYuan: (item.price / 100).toFixed(2),
        }));
      } catch (err) {
        console.error('加载订单失败', err);
        uni.showToast({ title: '加载失败', icon: 'none' });
        setTimeout(() => uni.navigateBack(), 1500);
      } finally {
        uni.hideLoading();
      }
    },

    // 价格输入格式化：元 → 分
    formatPrice(item) {
      if (item.priceYuan) {
        const yuan = parseFloat(item.priceYuan);
        if (!isNaN(yuan)) {
          item.price = Math.round(yuan * 100);
        } else {
          item.price = 0;
        }
      } else {
        item.price = 0;
      }
    },

    // 粗略库存检查（前端提醒）
    checkStock(item) {
      if (item.count < 0) item.count = 0;
    },

    // 删除商品项
    deleteItem(index) {
      uni.showModal({
        title: '提示',
        content: '确定要删除该商品吗？',
        success: (res) => {
          if (res.confirm) {
            this.goodsList.splice(index, 1);
          }
        }
      });
    },

    // 添加新商品
    addNewGoods() {
      if (!this.newGood.good_id || !this.newGood.name || !this.newGood.priceYuan || !this.newGood.count) {
        uni.showToast({ title: '请完整填写商品信息', icon: 'none' });
        return;
      }
      const count = parseInt(this.newGood.count, 10);
      if (count <= 0) {
        uni.showToast({ title: '数量必须大于0', icon: 'none' });
        return;
      }
      const priceYuan = parseFloat(this.newGood.priceYuan);
      if (isNaN(priceYuan) || priceYuan <= 0) {
        uni.showToast({ title: '价格必须为正数', icon: 'none' });
        return;
      }
      // 检查是否已存在相同商品
      const exists = this.goodsList.some(g => g.good_id === this.newGood.good_id);
      if (exists) {
        uni.showToast({ title: '该商品已存在，请直接修改', icon: 'none' });
        return;
      }
      // 添加到列表
      this.goodsList.push({
        good_id: this.newGood.good_id,
        name: this.newGood.name,
        standard: this.newGood.standard || '',
        originalPrice: 0,
        originalCount: 0,
        price: Math.round(priceYuan * 100),
        count: count,
        priceYuan: this.newGood.priceYuan,
      });
      // 清空新增表单
      this.newGood = { good_id: '', name: '', standard: '', priceYuan: '', count: 1 };
    },

    // 提交修改
    async submitEdit() {
      if (this.goodsList.length === 0) {
        uni.showToast({ title: '订单至少保留一个商品', icon: 'none' });
        return;
      }

      this.submitting = true;
      uni.showLoading({ title: '提交中...', mask: true });

      try {
        const res = await uniCloud.callFunction({
          name: 'adminUpdateOrder',
          data: {
            orderId: this.orderId,
            goodsList: this.goodsList.map(item => ({
              good_id: item.good_id,
              name: item.name,
              standard: item.standard,
              price: item.price,
              count: item.count,
            })),
          }
        });

        if (res.result.code === 0) {
          uni.hideLoading();
          uni.showToast({ title: '修改成功', icon: 'success' });
          const eventChannel = this.getOpenerEventChannel();
          eventChannel.emit('refreshData');
          setTimeout(() => uni.navigateBack(), 500);
        } else {
          uni.hideLoading();
          uni.showModal({ content: res.result.message, showCancel: false });
        }
      } catch (err) {
        uni.hideLoading();
        console.error('修改订单失败', err);
        uni.showModal({ content: err.message || '操作失败', showCancel: false });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped>
.edit-order-container {
  padding: 10px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.goods-item {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #eee;
}
.goods-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.goods-name {
  font-size: 16px;
  font-weight: bold;
}
.goods-standard {
  font-size: 14px;
  color: #666;
}
.goods-edit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.edit-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.label {
  font-size: 14px;
  color: #999;
}
.price-input, .count-input {
  width: 100px;
}
.delete-btn {
  margin-left: auto;
}
.add-goods {
  margin-top: 15px;
  padding: 10px;
  background-color: #fff;
  border-radius: 8px;
  border: 1px dashed #007aff;
}
.add-title {
  font-size: 14px;
  color: #007aff;
  margin-bottom: 8px;
}
.add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.add-input {
  width: 150px;
}
.add-btn {
  margin-left: auto;
}
.footer {
  margin-top: 20px;
  padding: 10px;
}
</style>