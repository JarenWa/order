"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      errMsg: ""
    };
  },
  onLoad(query) {
    this.errMsg = query.errMsg || "";
  }
};
if (!Array) {
  const _easycom_fix_window2 = common_vendor.resolveComponent("fix-window");
  _easycom_fix_window2();
}
const _easycom_fix_window = () => "../../components/fix-window/fix-window.js";
if (!Math) {
  _easycom_fix_window();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.errMsg
  }, $data.errMsg ? {
    b: common_vendor.t($data.errMsg)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ca2547bb"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/error/404.js.map
