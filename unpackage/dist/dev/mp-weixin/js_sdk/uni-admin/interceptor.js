"use strict";
const common_vendor = require("../../common/vendor.js");
const admin_config = require("../../admin.config.js");
function initInterceptor() {
  let isNavigatingToError = false;
  common_vendor.index.addInterceptor("navigateTo", {
    invoke({ url }) {
      isNavigatingToError = url && url.startsWith(admin_config.config.error.url) ? true : false;
    },
    fail: ({ errMsg }) => {
      if (errMsg.indexOf("is not found") !== -1) {
        if (!isNavigatingToError) {
          common_vendor.index.navigateTo({
            url: admin_config.config.error.url + "?errMsg=" + errMsg
          });
        }
      }
    }
  });
}
exports.initInterceptor = initInterceptor;
//# sourceMappingURL=../../../.sourcemap/mp-weixin/js_sdk/uni-admin/interceptor.js.map
