"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
const store_constants = require("./store/constants.js");
const js_sdk_extStorage_uploadFileForExtStorage = require("./js_sdk/ext-storage/uploadFileForExtStorage.js");
const store_index = require("./store/index.js");
const js_sdk_uniAdmin_plugin = require("./js_sdk/uni-admin/plugin.js");
const i18n_index = require("./i18n/index.js");
if (!Math) {
  "./pages/index/index.js";
  "./uni_modules/uni-id-pages/pages/userinfo/userinfo.js";
  "./uni_modules/uni-id-pages/pages/login/login-withoutpwd.js";
  "./uni_modules/uni-id-pages/pages/login/login-withpwd.js";
  "./uni_modules/uni-id-pages/pages/login/login-smscode.js";
  "./uni_modules/uni-id-pages/pages/register/register.js";
  "./uni_modules/uni-id-pages/pages/register/register-admin.js";
  "./uni_modules/uni-id-pages/pages/register/register-by-email.js";
  "./uni_modules/uni-id-pages/pages/retrieve/retrieve.js";
  "./uni_modules/uni-id-pages/pages/retrieve/retrieve-by-email.js";
  "./uni_modules/uni-id-pages/pages/userinfo/bind-mobile/bind-mobile.js";
  "./uni_modules/uni-id-pages/pages/userinfo/change_pwd/change_pwd.js";
  "./uni_modules/uni-id-pages/pages/userinfo/deactivate/deactivate.js";
  "./uni_modules/uni-id-pages/pages/userinfo/realname-verify/realname-verify.js";
  "./uni_modules/uni-id-pages/pages/userinfo/set-pwd/set-pwd.js";
  "./pages/goods/list.js";
  "./pages/goods/detail.js";
  "./pages/cart/index.js";
  "./pages/order/list.js";
  "./pages/order/detail.js";
  "./pages/order/edit.js";
  "./pages/order/confirm.js";
  "./pages/user/index.js";
  "./pages/user/info.js";
  "./pages/error/404.js";
  "./pages/address/add.js";
  "./pages/address/select.js";
  "./pages/address/edit.js";
  "./pages/pages_admin/index/index.js";
  "./pages/pages_admin/opendb-mall-categories/list.js";
  "./pages/pages_admin/opendb-mall-categories/add.js";
  "./pages/pages_admin/opendb-mall-categories/edit.js";
  "./pages/pages_admin/opendb-mall-categories/detail.js";
  "./pages/pages_admin/opendb-mall-goods/list.js";
  "./pages/pages_admin/opendb-mall-goods/add.js";
  "./pages/pages_admin/opendb-mall-goods/edit.js";
  "./pages/pages_admin/opendb-mall-goods/detail.js";
  "./pages/pages_admin/uni-pay-orders/list.js";
  "./pages/pages_admin/uni-pay-orders/add.js";
  "./pages/pages_admin/uni-pay-orders/edit.js";
  "./pages/pages_admin/uni-pay-orders/detail.js";
}
const _sfc_main = {
  created() {
    this.clear = void 0;
  },
  methods: {
    ...common_vendor.mapMutations("app", ["SET_THEME"]),
    ...common_vendor.mapActions({
      init: "app/init"
    }),
    clearPlatform() {
      const keysOfPlatform = common_vendor.index.getStorageInfoSync().keys.filter((key) => key.indexOf("platform") > -1);
      keysOfPlatform.length && keysOfPlatform.forEach((key) => common_vendor.index.removeStorageSync(key));
    }
  },
  onPageNotFound(msg) {
    common_vendor.index.switchTab({
      // 如果首页是 tabBar 页面，使用 switchTab
      url: "/pages/index/index"
    });
  },
  onLaunch: function() {
    common_vendor.index.__f__("log", "at App.vue:54", "App Launch");
    if (this.$uniIdPagesStore.store.hasLogin) {
      this.init();
    }
    common_vendor.index.$on("uni-id-pages-login-success", () => {
      this.init();
    });
    this.SET_THEME(common_vendor.index.getStorageSync(store_constants.uniAdminCacheKey.theme) || "default");
    js_sdk_extStorage_uploadFileForExtStorage.uploadFileForExtStorage.init({
      provider: "unicloud",
      // provider代表默认上传到哪，可选项 "unicloud" 内置存储; "extStorage" 扩展存储;
      domain: "cdn.example.com",
      //【重要】这里需要改成你开通扩展存储时绑定的自定义域名）
      fileID2fileURL: true,
      // 将fileID转成fileURL，方便兼容老项目
      // 获取上传参数的函数
      uploadFileOptions: async (event) => {
        const uniCloudStorageExtCo = common_vendor.tr.importObject("ext-storage-co");
        return await uniCloudStorageExtCo.getUploadFileOptions(event);
      }
    });
  },
  onShow: function() {
    common_vendor.index.__f__("log", "at App.vue:81", "App Show");
    this.clear = setInterval(() => this.clearPlatform(), 15 * 60 * 1e3);
  },
  onHide: function() {
    common_vendor.index.__f__("log", "at App.vue:85", "App Hide");
    this.clear && clearInterval(this.clear);
  }
};
const lang = common_vendor.index.getLocale();
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  const i18n = common_vendor.createI18n({
    locale: lang,
    messages: i18n_index.messages
  });
  app.use(i18n);
  app.use(js_sdk_uniAdmin_plugin.plugin);
  app.use(store_index.store);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
