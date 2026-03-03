"use strict";
const common_vendor = require("./common/vendor.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      refreshing: false,
      whereCondition: {}
      // 可以根据需要添加筛选条件
    };
  },
  created() {
    this.$nextTick(() => {
      this.$refs.udb && this.$refs.udb.loadData();
    });
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
    onRefresh() {
      this.refreshing = true;
      this.$refs.udb.loadData({ clear: true }, () => {
        this.refreshing = false;
      });
    },
    loadMore() {
      this.$refs.udb.loadMore();
    },
    editOrder(id) {
      common_vendor.index.navigateTo({
        url: "./edit?id=" + id,
        events: {
          refreshData: () => {
            this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    confirmCancel(order) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要取消该订单吗？",
        cancelText: "不取消",
        confirmText: "取消订单",
        success: (res) => {
          if (res.confirm) {
            this.cancelOrder(order);
          }
        }
      });
    },
    async cancelOrder(order) {
      common_vendor.index.showLoading({ title: "处理中..." });
      try {
        await db.collection("uni-pay-orders").doc(order._id).update({
          status: 3,
          admin_cancelled: true,
          update_date: Date.now()
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "已取消", icon: "success" });
        this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/pages_admin/uni-pay-orders/list.vue:131", "取消订单失败", err);
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      }
    },
    confirmShip(order) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要发货吗？",
        confirmText: "发货",
        success: (res) => {
          if (res.confirm) {
            this.shipOrder(order);
          }
        }
      });
    },
    async shipOrder(order) {
      common_vendor.index.showLoading({ title: "处理中..." });
      try {
        await db.collection("uni-pay-orders").doc(order._id).update({
          status: 1,
          update_date: Date.now()
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "已发货", icon: "success" });
        this.$refs.udb.loadData({ clear: true });
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/pages_admin/uni-pay-orders/list.vue:159", "发货失败", err);
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      }
    },
    confirmComplete(order) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要完成该订单吗？这将发放积分给用户。",
        confirmText: "完成",
        success: (res) => {
          if (res.confirm) {
            this.completeOrder(order);
          }
        }
      });
    },
    async completeOrder(order) {
      common_vendor.index.showLoading({ title: "处理中..." });
      try {
        const res = await common_vendor.tr.callFunction({
          name: "adminCompleteOrder",
          data: {
            orderId: order._id,
            userId: order.user_id,
            scoreEarned: order.score_earned
          }
        });
        if (res.result.code === 0) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "已完成", icon: "success" });
          this.$refs.udb.loadData({ clear: true });
        } else {
          common_vendor.index.hideLoading();
          common_vendor.index.showModal({ content: res.result.message, showCancel: false });
        }
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/pages_admin/uni-pay-orders/list.vue:196", "完成订单失败", err);
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      }
    }
  }
};
if (!Array) {
  const _easycom_uni_load_more2 = common_vendor.resolveComponent("uni-load-more");
  const _easycom_unicloud_db2 = common_vendor.resolveComponent("unicloud-db");
  (_easycom_uni_load_more2 + _easycom_unicloud_db2)();
}
const _easycom_uni_load_more = () => "./uni_modules/uni-load-more/components/uni-load-more/uni-load-more.js";
const _easycom_unicloud_db = () => "./node-modules/@dcloudio/uni-components/lib/unicloud-db/unicloud-db.js";
if (!Math) {
  (_easycom_uni_load_more + _easycom_unicloud_db)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.w(({
      data,
      loading,
      hasMore,
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
            e: common_vendor.t(item.consignee),
            f: common_vendor.t(item.mobile),
            g: common_vendor.t(item.address),
            h: common_vendor.f(item.goods_list, (good, index, i2) => {
              return {
                a: good.image || "/static/default-goods.png",
                b: common_vendor.t(good.name),
                c: common_vendor.t(good.standard),
                d: common_vendor.t((good.price / 100).toFixed(2)),
                e: common_vendor.t(good.count),
                f: index
              };
            }),
            i: common_vendor.t((item.total_amount / 100).toFixed(2)),
            j: common_vendor.t((item.score_earned / 100).toFixed(2)),
            k: item.status === 0
          }, item.status === 0 ? {
            l: common_vendor.o(($event) => $options.editOrder(item._id), item._id)
          } : {}, {
            m: item.status === 0
          }, item.status === 0 ? {
            n: common_vendor.o(($event) => $options.confirmCancel(item), item._id)
          } : {}, {
            o: item.status === 0
          }, item.status === 0 ? {
            p: common_vendor.o(($event) => $options.confirmShip(item), item._id)
          } : {}, {
            q: item.status === 1
          }, item.status === 1 ? {
            r: common_vendor.o(($event) => $options.confirmComplete(item), item._id)
          } : {}, {
            s: item._id
          });
        })
      } : {}, {
        c: loading,
        d: data && data.length > 0,
        f: "08129ca7-1-" + i0 + ",08129ca7-0",
        g: common_vendor.p({
          status: loading ? "loading" : hasMore ? "more" : "noMore"
        }),
        h: i0,
        i: s0
      });
    }, {
      name: "d",
      path: "a",
      vueId: "08129ca7-0"
    }),
    b: common_vendor.sr("udb", "08129ca7-0"),
    c: common_vendor.p({
      collection: "uni-pay-orders",
      where: $data.whereCondition,
      orderby: "create_date desc",
      ["page-size"]: 20,
      manual: true
    }),
    d: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args)),
    e: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    f: $data.refreshing
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-08129ca7"]]);
exports.MiniProgramPage = MiniProgramPage;
//# sourceMappingURL=../.sourcemap/mp-weixin/list3.js.map
