"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      userInfo: uni_modules_uniIdPages_common_store.store.userInfo
    };
  },
  onLoad() {
    if (!this.userInfo || !this.userInfo._id) {
      common_vendor.index.navigateTo({ url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd" });
    }
  },
  methods: {
    // 格式化完整地址（如果数据库没有存储 formatted_address）
    formatAddress(item) {
      const parts = [
        item.province_name,
        item.city_name,
        item.district_name,
        item.street_name,
        item.address
      ].filter((v) => v);
      return parts.join(" ");
    },
    // 选择地址，返回给上一页
    selectAddress(addr) {
      const eventChannel = this.getOpenerEventChannel();
      eventChannel.emit("onSelectAddress", addr);
      common_vendor.index.navigateBack();
    },
    // 新增地址
    addAddress() {
      common_vendor.index.navigateTo({
        url: "/pages/address/add",
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
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
      } : loading ? {} : data && data.length > 0 ? {
        e: common_vendor.f(data, (item, k1, i1) => {
          return common_vendor.e({
            a: common_vendor.t(item.name),
            b: item.alias
          }, item.alias ? {
            c: common_vendor.t(item.alias)
          } : {}, {
            d: item.is_default
          }, item.is_default ? {} : {}, {
            e: common_vendor.t(item.mobile),
            f: common_vendor.t(item.formatted_address || $options.formatAddress(item)),
            g: item._id,
            h: item.is_default ? 1 : "",
            i: common_vendor.o(($event) => $options.selectAddress(item), item._id)
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
      vueId: "58c4d8fe-0"
    }),
    b: common_vendor.sr("udb", "58c4d8fe-0"),
    c: common_vendor.p({
      collection: "uni-id-address",
      where: `user_id == '${$data.userInfo._id}'`,
      orderby: "is_default desc, create_date desc"
    }),
    d: common_vendor.o((...args) => $options.addAddress && $options.addAddress(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-58c4d8fe"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/address/select.js.map
