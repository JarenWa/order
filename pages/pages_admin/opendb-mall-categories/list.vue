<template>
  <view class="category-list-wrapper">
    <!-- 可滚动列表区域 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      refresher-enabled
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :refresher-triggered="refreshing"
    >
      <!-- 数据列表（unicloud-db） -->
      <unicloud-db
        ref="udb"
        v-slot:default="{ data, loading, hasMore, error }"
        :collection="collectionList"
        field="name,sort,description"
        orderby="sort asc"
        :manual="true"
      >
        <view v-if="error" class="error">{{ error.message }}</view>
        <view v-else-if="data">
          <uni-list>
            <uni-list-item
              v-for="(item, index) in data"
              :key="index"
              showArrow
              :clickable="true"
              @click="handleItemClick(item._id)"
            >
              <template v-slot:body>
                <view class="item-content">
                  <view class="info">
                    <text class="name">{{ item.name }}</text>
                    <text class="description">{{ item.description || '暂无描述' }}</text>
                  </view>
                </view>
              </template>
            </uni-list-item>
          </uni-list>
        </view>
        <uni-load-more :status="loading ? 'loading' : (hasMore ? 'more' : 'noMore')" />
      </unicloud-db>
    </scroll-view>

    <!-- 新增按钮，固定在右下角，不随滚动移动 -->
    <uni-fab
      ref="fab"
      horizontal="right"
      vertical="bottom"
      :pop-menu="false"
      @fabClick="fabClick"
      class="fab-fixed"
    />
  </view>
</template>

<script>
export default {
  data() {
    return {
      collectionList: 'opendb-mall-categories',
      refreshing: false, // 下拉刷新状态
    };
  },
  created() {
    // 组件创建后加载数据
    this.$nextTick(() => {
      if (this.$refs.udb) {
        this.$refs.udb.loadData();
      }
    });
  },
  methods: {
    // 下拉刷新
    onRefresh() {
      this.refreshing = true;
      this.$refs.udb.loadData({ clear: true }, () => {
        this.refreshing = false;
      });
    },
    // 上拉加载更多
    loadMore() {
      this.$refs.udb.loadMore();
    },
    // 点击行进入详情页（使用绝对路径）
    handleItemClick(id) {
      uni.navigateTo({
        url: '../opendb-mall-categories/detail?id=' + id,
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    // 点击新增按钮（使用绝对路径）
    fabClick() {
      uni.navigateTo({
        url: '../opendb-mall-categories/add',
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
  },
};
</script>

<style scoped>
/* 确保 scroll-view 占满父容器高度 */
.list-scroll {
  height: 100%;
  background-color: #f8f8f8;
}

.item-content {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.name {
  font-size: 36rpx;
  font-weight: 700;
  color: #ff6000;
  margin-bottom: 8rpx;
}
.description {
  font-size: 28rpx;
  color: #999;
}
.error {
  color: #e64340;
  text-align: center;
  margin-top: 60rpx;
}
.category-list-wrapper {
  height: 100%;
  position: relative;
  overflow: hidden;
}
.list-scroll {
  height: 100%;
}
.fab-fixed {
  position: fixed;
  right: 10px;
  bottom: 10px;
  z-index: 100;
}

</style>