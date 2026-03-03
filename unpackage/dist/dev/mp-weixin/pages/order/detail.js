"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      orderId: ""
    };
  },
  onLoad(options) {
    this.orderId = options.id;
  },
  methods: {
    getStatusText(status) {
      const map = { 0: "待发货", 1: "配送中", 2: "已收货", 3: "已取消" };
      return map[status] || "未知";
    },
    formatDate(timestamp) {
      if (!timestamp)
        return "-";
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    },
    cancelOrder() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定取消该订单？",
        success: (res) => {
          if (res.confirm) {
            db.collection("uni-pay-orders").doc(this.orderId).update({
              status: 3,
              cancel_date: Date.now()
            }).then(() => {
              common_vendor.index.showToast({ title: "已取消", icon: "success" });
              this.$refs.udb.loadData({ clear: true });
            }).catch((err) => {
              common_vendor.index.showModal({ content: err.message, showCancel: false });
            });
          }
        }
      });
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
      } : loading ? {} : data ? common_vendor.e({
        e: common_vendor.t($options.getStatusText(data.status)),
        f: common_vendor.n("status-" + data.status),
        g: common_vendor.t(data.consignee),
        h: common_vendor.t(data.mobile),
        i: common_vendor.t(data.address),
        j: common_vendor.f(data.goods_list, (good, index, i1) => {
          return {
            a: good.image || "/static/default-goods.png",
            b: common_vendor.t(good.name),
            c: common_vendor.t(good.standard),
            d: common_vendor.t((good.price / 100).toFixed(2)),
            e: common_vendor.t(good.count),
            f: common_vendor.t((good.total / 100).toFixed(2)),
            g: index
          };
        }),
        k: common_vendor.t((data.total_amount / 100).toFixed(2)),
        l: common_vendor.t((data.actual_payment / 100).toFixed(2)),
        m: common_vendor.t((data.score_earned / 100).toFixed(2)),
        n: common_vendor.t(data.order_no),
        o: common_vendor.t($options.formatDate(data.create_date)),
        p: data.cancel_date
      }, data.cancel_date ? {
        q: common_vendor.t($options.formatDate(data.cancel_date))
      } : {}, {
        r: data.status === 0
      }, data.status === 0 ? {
        s: common_vendor.o((...args) => $options.cancelOrder && $options.cancelOrder(...args))
      } : {}, {
        t: data.status === 2
      }, data.status === 2 ? {} : {}) : {}, {
        c: loading,
        d: data,
        v: i0,
        w: s0
      });
    }, {
      name: "d",
      path: "a",
      vueId: "6b23c96c-0"
    }),
    b: common_vendor.sr("udb", "6b23c96c-0"),
    c: common_vendor.p({
      collection: "uni-pay-orders",
      where: `_id == '${$data.orderId}'`,
      getone: true
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-6b23c96c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/order/detail.js.map
