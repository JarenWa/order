<template>
  <view class="container">
    <unicloud-db ref="udb" v-slot:default="{data, loading, error, options}" :options="options"
      :collection="collectionList" field="name,sort,description" :where="queryWhere" :getone="true"
      :manual="true">
      <view v-if="error">{{error.message}}</view>
      <view v-else-if="loading">
        <uni-load-more :contentText="loadMore" status="loading"></uni-load-more>
      </view>
      <view v-else-if="data">
        <view>
          <text>类别名称: </text>
          <text>{{data.name}}</text>
        </view>
        <view>
          <text>排序: </text>
          <text>{{data.sort}}</text>
        </view>
        <view>
          <text>类别描述: </text>
          <text>{{data.description}}</text>
        </view>
      </view>
    </unicloud-db>
    <view class="btns">
      <button type="primary" @click="handleUpdate">修改</button>
      <button type="warn" class="btn-delete" @click="confirmDelete">删除</button>
    </view>
  </view>
</template>

<script>
  // 由schema2code生成，包含校验规则和enum静态数据
  import {
    enumConverter
  } from '../../../js_sdk/validator/opendb-mall-categories.js'
  const db = uniCloud.database()

  export default {
    data() {
      return {
        queryWhere: '',
        collectionList: "opendb-mall-categories",
        loadMore: {
          contentdown: '',
          contentrefresh: '',
          contentnomore: ''
        },
        options: {
          // 将scheme enum 属性静态数据中的value转成text
          ...enumConverter
        },
        eventChannel: null // 保存事件通道
      }
    },
    onLoad(e) {
      this._id = e.id
      // 获取从列表页传递的事件通道
      this.eventChannel = this.getOpenerEventChannel()
    },
    onReady() {
      if (this._id) {
        this.queryWhere = '_id=="' + this._id + '"'
      }
    },
    methods: {
      handleUpdate() {
        // 打开修改页面
        uni.navigateTo({
          url: '../opendb-mall-categories/edit?id=' + this._id,
          events: {
            // 监听修改页面成功修改数据后, 刷新当前页面数据
            refreshData: () => {
              this.$refs.udb.loadData({ clear: true })
              // 通知列表页刷新
              if (this.eventChannel) {
                this.eventChannel.emit('refreshData')
              }
            }
          }
        })
      },
      // 删除确认
      confirmDelete() {
        uni.showModal({
          title: '提示',
          content: '确定要删除该类别吗？',
          success: (res) => {
            if (res.confirm) {
              this.handleDelete()
            }
          }
        })
      },
      handleDelete() {
        this.$refs.udb.remove(this._id, {
          success: (res) => {
            uni.showToast({
              icon: 'none',
              title: '删除成功'
            })
            // 通知列表页刷新
            if (this.eventChannel) {
              this.eventChannel.emit('refreshData')
            }
            // 返回列表页
            setTimeout(() => uni.navigateBack(), 500)
          },
          fail: (err) => {
            uni.showModal({
              content: err.message || '删除失败',
              showCancel: false
            })
          }
        })
      }
    }
  }
</script>

<style>
  .container {
    padding: 10px;
  }

  .btns {
    margin-top: 10px;
    /* #ifndef APP-NVUE */
    display: flex;
    /* #endif */
    flex-direction: row;
  }

  .btns button {
    flex: 1;
  }

  .btn-delete {
    margin-left: 10px;
  }
</style>