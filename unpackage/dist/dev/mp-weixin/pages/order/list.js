"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      userInfo: uni_modules_uniIdPages_common_store.store.userInfo,
      status: null
      // 接收从路由传入的状态参数
    };
  },
  computed: {
    // 动态查询条件
    whereCondition() {
      const condition = { user_id: this.userInfo._id };
      if (this.status !== null && this.status >= 0) {
        condition.status = this.status;
      }
      return condition;
    }
  },
  onLoad(options) {
    if (!this.userInfo || !this.userInfo._id) {
      common_vendor.index.navigateTo({ url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd" });
      return;
    }
    if (options.status !== void 0) {
      this.status = parseInt(options.status, 10);
    }
  },
  methods: {
    getStatusText(status) {
      const map = { 0: "待发货", 1: "配送中", 2: "已收货", 3: "已取消" };
      return map[status] || "未知";
    },
    getOrderIsPreText(is_pre_order) {
      if (is_pre_order == true) {
        return "预售订单";
      }
    },
    goDetail(id) {
      common_vendor.index.navigateTo({ url: "./detail?id=" + id });
    },
    // 取消订单（状态0 -> 状态3）
    confirmCancel(orderId) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要取消该订单吗？",
        confirmText: "要取消",
        cancelText: "不取消",
        success: (res) => {
          if (res.confirm) {
            this.cancelOrder(orderId);
          }
        }
      });
    },
    async cancelOrder(orderId) {
      common_vendor.index.showLoading({ title: "处理中..." });
      try {
        await db.collection("uni-pay-orders").doc(orderId).update({
          status: 3,
          update_date: Date.now()
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "已取消", icon: "success" });
        this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/order/list.vue:125", "取消订单失败", err);
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      }
    },
    // 修改订单
    editOrder(orderId) {
      common_vendor.index.navigateTo({
        url: "../order/edit?id=" + orderId,
        events: {
          refreshData: () => {
            this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    // 确认收货（状态1 -> 状态2，并发放积分）
    confirmReceive(orderId) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确认已收到商品？",
        confirmText: "确认收货",
        cancelText: "再想想",
        success: (res) => {
          if (res.confirm) {
            this.receiveOrder(orderId);
          }
        }
      });
    },
    async receiveOrder(orderId) {
      common_vendor.index.showLoading({ title: "处理中..." });
      try {
        const res = await common_vendor.tr.callFunction({
          name: "confirmReceive",
          data: {
            orderId,
            userId: this.userInfo._id
          }
        });
        if (res.result.code === 0) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "确认收货成功", icon: "success" });
          this.$refs.udb.loadData({ clear: true });
        } else {
          common_vendor.index.hideLoading();
          common_vendor.index.showModal({ content: res.result.message, showCancel: false });
        }
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/order/list.vue:178", "确认收货失败", err);
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      }
    },
    // 删除订单（状态3）
    confirmDelete(orderId) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要删除该订单吗？此操作不可恢复。",
        confirmText: "删除",
        cancelText: "保留",
        success: (res) => {
          if (res.confirm) {
            this.deleteOrder(orderId);
          }
        }
      });
    },
    async deleteOrder(orderId) {
      common_vendor.index.showLoading({ title: "删除中..." });
      try {
        await db.collection("uni-pay-orders").doc(orderId).remove();
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "删除成功", icon: "success" });
        this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/order/list.vue:207", "删除订单失败", err);
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      }
    }
  }
};
if (!Array) {
  const _easycom_unicloud_db2 = common_vendor.resolveComponent("unicloud-db");
  _easycom_unicloud_db2();
}
const _easycom_unicloud_db = () => "../../node-modules/@dcloudio/uni-components/lib/unicloud-db/unicloud-db.js";
if (!Math) {
  _easycom_unicloud_db();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.w(({
      data,
      loading,
      error
    }, s0, i0) => {
      return common_vendor.e({
        a: error
      }, error ? {
        b: common_vendor.t(error.message)
      } : loading ? {} : data && data.length > 0 ? {
        e: common_vendor.f(data, (item, k1, i1) => {
          return common_vendor.e({
            a: common_vendor.t($options.getOrderIsPreText(item.is_pre_order)),
            b: common_vendor.t(item.order_no),
            c: common_vendor.t($options.getStatusText(item.status)),
            d: common_vendor.n("status-" + item.status),
            e: common_vendor.o(($event) => $options.goDetail(item._id), item._id),
            f: common_vendor.f(item.goods_list, (good, index, i2) => {
              return {
                a: good.image || "/static/default-goods.png",
                b: common_vendor.t(good.name),
                c: common_vendor.t(good.standard),
                d: common_vendor.t((good.price / 100).toFixed(2)),
                e: common_vendor.t(good.count),
                f: index
              };
            }),
            g: common_vendor.o(($event) => $options.goDetail(item._id), item._id),
            h: common_vendor.t(item.goods_list.length),
            i: common_vendor.t((item.total_amount / 100).toFixed(2)),
            j: item.status === 0
          }, item.status === 0 ? {
            k: common_vendor.o(($event) => $options.confirmCancel(item._id), item._id)
          } : {}, {
            l: item.status === 0
          }, item.status === 0 ? {
            m: common_vendor.o(($event) => $options.editOrder(item._id), item._id)
          } : {}, {
            n: item.status === 1
          }, item.status === 1 ? {
            o: common_vendor.o(($event) => $options.confirmReceive(item._id), item._id)
          } : {}, {
            p: item.status === 3
          }, item.status === 3 ? {
            q: common_vendor.o(($event) => $options.confirmDelete(item._id), item._id)
          } : {}, {
            r: item._id
          });
        })
      } : {}, {
        c: loading,
        d: data && data.length > 0,
        f: i0,
        g: s0
      });
    }, {
      name: "d",
      path: "a",
      vueId: "456ecf67-0"
    }),
    b: common_vendor.sr("udb", "456ecf67-0"),
    c: common_vendor.p({
      collection: "uni-pay-orders",
      where: $options.whereCondition,
      orderby: "create_date desc"
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-456ecf67"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/order/list.js.map
