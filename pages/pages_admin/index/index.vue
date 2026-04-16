<template>
  <view class="admin-container">
    <!-- 底部选项卡 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: current === 0 }"
        @click="switchTab(0)"
      >订单管理</view>
	  
	  <view
	    class="tab-item"
	    :class="{ active: current === 1 }"
	    @click="switchTab(1)"
	  >预售汇总</view>
	  
      <view
        class="tab-item"
        :class="{ active: current === 2 }"
        @click="switchTab(2)"
      >商品管理</view>
     
	  
	  <view
	    class="tab-item"
	    :class="{ active: current === 3 }"
	    @click="switchTab(3)"
	  >兑换物品</view>
	  
	  <view
	    class="tab-item"
	    :class="{ active: current === 4 }"
	    @click="switchTab(4)"
	  >兑换管理</view>
    </view>

    <!-- 内容区域：滑动切换（可选） -->
    <swiper :current="current" @change="onSwiperChange" class="swiper">
      <swiper-item>
        <orders-list v-if="current === 0" />
      </swiper-item>
	  
	  <swiper-item>
	    <pre-orders-list v-if="current === 1" />
	  </swiper-item>
	  
      <swiper-item>
        <goods-list v-if="current === 2" />
      </swiper-item>
	  
     
	 
	  <swiper-item>
	    <exchange-goods-list v-if="current === 3" />
	  </swiper-item>
	  
	  <swiper-item>
	    <exchange-records-list v-if="current === 4" />
	  </swiper-item>
    </swiper>
  </view>
</template>

<script>
// import CategoriesList from '../opendb-mall-categories/list.vue';
import GoodsList from '../opendb-mall-goods/list.vue';
import OrdersList from '../uni-pay-orders/list.vue';
import PreOrdersList from '../uni-pay-orders/pre-order-list.vue';
import ExchangeGoodsList from '../exchange/list.vue';
import ExchangeRecordsList from '../exchange/records-list.vue';
export default {
  components: {  GoodsList, OrdersList ,PreOrdersList, ExchangeGoodsList, ExchangeRecordsList},
  data() {
    return { current: 0 };
  },
  methods: {
    switchTab(index) {
      this.current = index;
    },
    onSwiperChange(e) {
      this.current = e.detail.current;
    }
  }
};
</script>

<style scoped>
.admin-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.tab-bar {
  display: flex;
  height: 50px;
  background: #fff;
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #666;
}
.tab-item.active {
  color: #007aff;
  font-weight: 500;
}
.swiper {
  flex: 1;
  width: 100%;
}
</style>