"use strict";
const common_vendor = require("../../../common/vendor.js");
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
    }
  }
};
if (!Array) {
  const _easycom_unicloud_db2 = common_vendor.resolveComponent("unicloud-db");
  _easycom_unicloud_db2();
}
const _easycom_unicloud_db = () => "../../../node-modules/@dcloudio/uni-components/lib/unicloud-db/unicloud-db.js";
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
        g: common_vendor.t(data.order_no),
        h: common_vendor.t($options.formatDate(data.create_date)),
        i: common_vendor.t($options.formatDate(data.update_date)),
        j: common_vendor.t(data.consignee),
        k: common_vendor.t(data.mobile),
        l: common_vendor.t(data.address),
        m: common_vendor.f(data.goods_list, (good, index, i1) => {
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
        n: common_vendor.t((data.total_amount / 100).toFixed(2)),
        o: common_vendor.t((data.actual_payment / 100).toFixed(2)),
        p: common_vendor.t((data.score_earned / 100).toFixed(2)),
        q: data.remark
      }, data.remark ? {
        r: common_vendor.t(data.remark)
      } : {}, {
        s: data.admin_modified
      }, data.admin_modified ? {} : {}, {
        t: data.admin_cancelled
      }, data.admin_cancelled ? {} : {}, {
        v: data.admin_completed
      }, data.admin_completed ? {} : {}, {
        w: common_vendor.o((...args) => common_vendor.index.navigateBack && common_vendor.index.navigateBack(...args))
      }) : {}, {
        c: loading,
        d: data,
        x: i0,
        y: s0
      });
    }, {
      name: "d",
      path: "a",
      vueId: "8cf0cd0c-0"
    }),
    b: common_vendor.sr("udb", "8cf0cd0c-0"),
    c: common_vendor.p({
      collection: "uni-pay-orders",
      where: `_id == '${$data.orderId}'`,
      getone: true
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8cf0cd0c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/pages_admin/uni-pay-orders/detail.js.map
