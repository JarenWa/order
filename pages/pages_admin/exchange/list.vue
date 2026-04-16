<template>
  <view class="page-container">
	  <!-- 顶部工具栏 -->
	  <view class="toolbar">
	    <view class="filter-menu">
	      <picker @change="onStatusFilterChange" :value="statusIndex" :range="statusOptions">
	        <view class="picker">
	          {{ statusOptions[statusIndex] }}
	          <text class="uni-icon uni-icon-arrowdown">▼</text>
	        </view>
	      </picker>
	    </view>
	    <view class="search-box">
	      <input
	        class="search-input"
	        type="text"
	        v-model="searchInput"
	        placeholder="输入物品名称"
	        confirm-type="search"
	        @confirm="onSearch"
	      />
	      <button class="search-btn" type="default" size="mini" @click="onSearch">搜索</button>
	    </view>
	  </view>
	  
    <scroll-view
      class="list-scroll"
      scroll-y
      refresher-enabled
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :refresher-triggered="refreshing"
    >
     

      <!-- 数据列表 -->
      <unicloud-db
        ref="udb"
        v-slot:default="{ data, loading, hasMore, error }"
        collection="exchange_goods"
		:key="refreshKey"
        :where="whereCondition"
        orderby="create_date desc"
        :page-size="20"
        :manual="true"
      >
        <view v-if="error" class="error">{{ error.message }}</view>
        <view v-else-if="data && data.length > 0" class="goods-list">
          <view v-for="item in data" :key="item._id" class="goods-card">
           
            <image class="goods-image" :src="item.image || '/static/tab/goods-default.png'" mode="aspectFill" />
            <!-- 中间信息区域 -->
            <view class="goods-info">
              <view class="info-header">
                <text class="name">{{ item.name }}</text>
              </view>
			  <text>{{ item.standard || '-'}}</text>
              <text class="points">所需积分：{{ (item.points_required / 100).toFixed(2) }}</text>
              <text class="stock">库存：{{ item.stock }}</text>
              <text class="description">{{ item.description || '-' }}</text>
			  <text class="status" :class="item.status === 0 ? 'online' : 'offline'">
			    {{ item.status === 0 ? '上架' : '下架' }}
			  </text>
            </view>
            <!-- 右侧操作图标 -->
            <view class="action-icons">
              <uni-icons type="compose" size="20" color="#409eff" @click.stop="editGoods(item._id)" />
              <uni-icons type="trash" size="20" color="#f44336" @click.stop="deleteGoods(item)" />
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="empty">暂无兑换物品</view>
        <uni-load-more :status="loading ? 'loading' : (hasMore ? 'more' : 'noMore')" />
      </unicloud-db>
    </scroll-view>

    <!-- 悬浮新增按钮 -->
    <uni-fab horizontal="right" vertical="bottom" :pop-menu="false" @fabClick="fabClick" />
  </view>
</template>

<script>
const db = uniCloud.database();

export default {
  data() {
    return {
		refreshKey: 0,       // 强制刷新标识
      searchInput: '',
      searchText: '',
      statusOptions: ['全部', '上架', '下架'],
      statusIndex: 0,
      statusType: 'all', // 'all', 'online', 'offline'
      refreshing: false,
      refreshTimer: null,
      refreshInterval: 10000, // 10秒刷新
    };
  },
  computed: {
    whereCondition() {
      const condition = {};
      if (this.searchText) {
        condition.name = new RegExp(this.searchText, 'i');
      }
      if (this.statusType === 'online') {
        condition.status = 0;
      } else if (this.statusType === 'offline') {
        condition.status = 1;
      }
      return condition;
    }
  },
  created() {
    this.$nextTick(() => {
      this.$refs.udb && this.$refs.udb.loadData();
    });
  },
  onShow() {
    this.startRefreshTimer();
  },
  onHide() {
    this.clearRefreshTimer();
  },
  onUnload() {
    this.clearRefreshTimer();
  },
  methods: {
    onStatusFilterChange(e) {
		// 清空搜索输入框
		this.searchInput = '';
		this.searchText = '';
      this.statusIndex = e.detail.value;
      const types = ['all', 'online', 'offline'];
      this.statusType = types[this.statusIndex];
	  this.refreshKey++;       // 强制刷新标识
      //this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },
    onSearch() {
      this.searchText = this.searchInput;
	   this.refreshKey++;   
      //this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },
    onRefresh() {
      this.refreshing = true;
      this.$refs.udb.loadData({ clear: true }, () => {
        this.refreshing = false;
      });
    },
    loadMore() {
      this.$refs.udb.loadMore();
    },
    // handleItemClick(id) {
    //   uni.navigateTo({
    //     url: '../exchange/detail?id=' + id,
    //     events: {
    //       refreshData: () => {
    //         this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    //       }
    //     }
    //   });
    // },
    editGoods(id) {
      uni.navigateTo({
        url: '../exchange/edit?id=' + id,
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    fabClick() {
      uni.navigateTo({
        url: '../exchange/add',
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    async deleteGoods(item) {
      uni.showModal({
        title: '提示',
        content: `确定删除“${item.name}”吗？`,
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '删除中' });
            try {
              await db.collection('exchange_goods').doc(item._id).remove();
              uni.hideLoading();
              uni.showToast({ title: '删除成功' });
              this.$refs.udb && this.$refs.udb.loadData({ clear: true });
            } catch (err) {
              uni.hideLoading();
              console.error(err);
              uni.showToast({ title: '删除失败', icon: 'none' });
            }
          }
        }
      });
    },
    startRefreshTimer() {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.refreshTimer = setInterval(() => {
        this.refreshData();
      }, this.refreshInterval);
    },
    clearRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },
    refreshData() {
      if (this.$refs.udb) {
        this.$refs.udb.loadData({ clear: true });
      }
    }
  }
};
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;  
}
.list-scroll {
	flex: 0.92;
	overflow-y: auto;          
  /* height: 100%; */
  background-color: #f8f8f8;
}
.toolbar {
  display: flex;
  align-items: center;
  margin: 10px;
  background-color: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.filter-menu {
  flex-shrink: 0;
  margin-right: 10px;
  font-size: 16px;
}
.picker {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background-color: #f9f9f9;
}
.uni-icon-arrowdown {
  margin-left: 4px;
  font-size: 14px;
  color: #666;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
}
.search-input {
  flex: 1;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 20px 0 0 20px;
  padding: 0 12px;
  font-size: 14px;
  background-color: #f5f5f5;
}
.search-btn {
  flex-shrink: 0;
  height: 36px;
  line-height: 36px;
  border-radius: 0 20px 20px 0;
  margin-left: -1px;
  font-size: 14px;
  background-color: #007aff;
  color: #fff;
  border: none;
}
.error {
  padding: 20px;
  text-align: center;
  color: #ff5500;
}
.empty {
  text-align: center;
  padding: 20px;
  color: #999;
}
.goods-list {
  padding: 0 10px;
}
.goods-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.2s;
  flex-wrap: nowrap; /* 禁止换行 */
}
.goods-card:active {
  transform: scale(0.98);
}
.goods-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  background-color: #f5f5f5;
  margin-right: 12px;
  object-fit: cover;
  flex-shrink: 0; /* 图片不压缩 */
}
.goods-info {
  flex: 1;
  min-width: 0; /* 允许内容截断 */
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
}
.status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}
.online {
  background-color: #4caf50;
  color: #fff;
}
.offline {
  background-color: #999;
  color: #fff;
}
.points {
  font-size: 14px;
  color: #ff6000;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stock {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.description {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.action-icons {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-left: 10px;
  flex-shrink: 0; /* 图标区域不压缩 */
}
.action-icons .uni-icons {
  cursor: pointer;
}
</style>