"use strict";
function fetchMock(url) {
  return Promise.resolve([]);
}
function initFetch(app) {
  app.config.globalProperties.$fetch = fetchMock;
}
exports.initFetch = initFetch;
//# sourceMappingURL=../../../.sourcemap/mp-weixin/js_sdk/uni-admin/fetchMock.js.map
