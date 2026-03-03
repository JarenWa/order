"use strict";
const common_vendor = require("../../../common/vendor.js");
const CategoriesList = () => "../opendb-mall-categories/list2.js";
const GoodsList = () => "../opendb-mall-goods/list2.js";
const OrdersList = () => "../uni-pay-orders/list2.js";
const _sfc_main = {
  components: { CategoriesList, GoodsList, OrdersList },
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
if (!Array) {
  const _component_categories_list = common_vendor.resolveComponent("categories-list");
  const _component_goods_list = common_vendor.resolveComponent("goods-list");
  const _component_orders_list = common_vendor.resolveComponent("orders-list");
  (_component_categories_list + _component_goods_list + _component_orders_list)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.current === 0 ? 1 : "",
    b: common_vendor.o(($event) => $options.switchTab(0)),
    c: $data.current === 1 ? 1 : "",
    d: common_vendor.o(($event) => $options.switchTab(1)),
    e: $data.current === 2 ? 1 : "",
    f: common_vendor.o(($event) => $options.switchTab(2)),
    g: $data.current === 0
  }, $data.current === 0 ? {} : {}, {
    h: $data.current === 1
  }, $data.current === 1 ? {} : {}, {
    i: $data.current === 2
  }, $data.current === 2 ? {} : {}, {
    j: $data.current,
    k: common_vendor.o((...args) => $options.onSwiperChange && $options.onSwiperChange(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0ebb13cb"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/pages_admin/index/index.js.map
