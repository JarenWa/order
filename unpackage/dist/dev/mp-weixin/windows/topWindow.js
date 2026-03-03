"use strict";
const common_vendor = require("../common/vendor.js");
const admin_config = require("../admin.config.js");
const errorLog = () => "./components/error-log.js";
const _sfc_main = {
  components: {
    errorLog
  },
  props: {
    navigationBarTitleText: {
      type: String
    },
    matchLeftWindow: {
      type: Boolean
    },
    showLeftWindow: {
      type: Boolean
    }
  },
  data() {
    return {
      ...admin_config.config.navBar,
      popupMenuOpened: false,
      themeMenuOpened: false,
      langMenuOpened: false,
      mpCapsule: 0,
      langIndex: 0
    };
  },
  computed: {
    ...common_vendor.mapState("app", ["appName", "routes", "theme"]),
    ...common_vendor.mapState("error", ["logs"]),
    userInfo() {
      return this.$uniIdPagesStore.store.userInfo;
    },
    themeIndex() {
      let i = 0;
      this.themes.forEach((theme, index) => {
        if (theme.value === this.theme)
          i = index;
      });
      return i;
    }
  },
  mounted() {
    let menuButtonInfo = common_vendor.index.getMenuButtonBoundingClientRect();
    this.mpCapsule = menuButtonInfo.width;
  },
  methods: {
    ...common_vendor.mapMutations("app", ["SET_THEME"]),
    showErrorLogs() {
      if (this.popupMenuOpened) {
        this.popupMenuOpened = false;
      }
      this.$refs.errorLogsPopup.open();
    },
    showPasswordPopup() {
      if (this.popupMenuOpened) {
        this.popupMenuOpened = false;
      }
      this.$refs.passwordPopup.open();
    },
    logout() {
      this.popupMenuOpened = false;
      this.$uniIdPagesStore.mutations.logout();
    },
    toggleSidebar() {
      if (!this.showLeftWindow) {
        common_vendor.index.showLeftWindow();
      } else {
        common_vendor.index.hideLeftWindow();
      }
    },
    togglePopupMenu() {
      this.popupMenuOpened = !this.popupMenuOpened;
      if (this.popupMenuOpened) {
        this.themeMenuOpened = false;
        this.langMenuOpened = false;
      }
    },
    toggleThemeMenu() {
      this.themeMenuOpened = !this.themeMenuOpened;
      if (this.themeMenuOpened) {
        this.popupMenuOpened = false;
        this.langMenuOpened = false;
      }
    },
    toggleLangMenu() {
      this.langMenuOpened = !this.langMenuOpened;
      if (this.langMenuOpened) {
        this.popupMenuOpened = false;
        this.themeMenuOpened = false;
      }
    },
    closeThemeMenu() {
      this.themeMenuOpened = false;
    },
    closeLangMenu() {
      this.langMenuOpened = false;
    },
    changePassword() {
      common_vendor.index.navigateTo({
        url: "/uni_modules/uni-id-pages/pages/userinfo/change_pwd/change_pwd",
        complete: () => {
          this.popupMenuOpened = false;
        }
      });
    },
    changeLanguage(index) {
      if (!index || index < 0)
        index = 0;
      const lang = this.langs[index].lang || "zh-Hans";
      if (!this.$i18n) {
        common_vendor.index.showToast({
          icon: "error",
          title: "暂不支持",
          duration: 2e3
        });
        return;
      }
      this.$i18n.locale = lang;
      this.langIndex = index;
      this.langMenuOpened = false;
      common_vendor.index.setLocale(lang);
    },
    linkTo() {
      common_vendor.index.reLaunch({
        url: "/"
      });
    },
    changeTheme(index) {
      const theme = this.themes[index].value || "default";
      if (this.theme !== theme)
        this.SET_THEME(theme);
      this.themeMenuOpened = false;
    }
  }
};
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _component_error_log = common_vendor.resolveComponent("error-log");
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  (_easycom_uni_icons2 + _component_error_log + _easycom_uni_popup2)();
}
const _easycom_uni_icons = () => "../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_uni_popup = () => "../uni_modules/uni-popup/components/uni-popup/uni-popup.js";
if (!Math) {
  (_easycom_uni_icons + _easycom_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: _ctx.logo,
    b: common_vendor.t(_ctx.appName),
    c: common_vendor.o((...args) => $options.linkTo && $options.linkTo(...args)),
    d: common_vendor.o($options.toggleSidebar),
    e: common_vendor.p({
      type: "bars",
      size: "30",
      color: "#999"
    }),
    f: common_vendor.t($props.navigationBarTitleText),
    g: common_vendor.p({
      type: "color-filled",
      size: "24",
      color: "#999"
    }),
    h: common_vendor.p({
      type: "arrowdown",
      color: "#666",
      size: "13"
    }),
    i: common_vendor.o((...args) => $options.toggleThemeMenu && $options.toggleThemeMenu(...args)),
    j: common_vendor.o((...args) => $options.closeThemeMenu && $options.closeThemeMenu(...args)),
    k: common_vendor.f(_ctx.themes, (theme, index, i0) => {
      return {
        a: common_vendor.t(theme.text),
        b: index,
        c: $options.themeIndex === index ? 1 : "",
        d: common_vendor.o(($event) => $options.changeTheme(index), index)
      };
    }),
    l: $data.themeMenuOpened ? 1 : "",
    m: $data.themeMenuOpened ? 1 : "",
    n: common_vendor.p({
      type: "arrowdown",
      color: "#666",
      size: "13"
    }),
    o: common_vendor.o((...args) => $options.toggleLangMenu && $options.toggleLangMenu(...args)),
    p: common_vendor.o((...args) => $options.closeLangMenu && $options.closeLangMenu(...args)),
    q: common_vendor.f(_ctx.langs, (lang, index, i0) => {
      return {
        a: common_vendor.t(lang.text),
        b: index,
        c: $data.langIndex === index ? 1 : "",
        d: common_vendor.o(($event) => $options.changeLanguage(index), index)
      };
    }),
    r: $data.langMenuOpened ? 1 : "",
    s: $data.langMenuOpened ? 1 : "",
    t: common_vendor.t($options.userInfo.nickname || $options.userInfo.username || $options.userInfo.mobile || $options.userInfo.email),
    v: common_vendor.p({
      type: "arrowdown",
      color: "#666",
      size: "13"
    }),
    w: $options.userInfo.nickname || $options.userInfo.username || $options.userInfo.mobile || $options.userInfo.email,
    x: common_vendor.o((...args) => $options.togglePopupMenu && $options.togglePopupMenu(...args)),
    y: common_vendor.o((...args) => $options.togglePopupMenu && $options.togglePopupMenu(...args)),
    z: $options.userInfo.nickname || $options.userInfo.username || $options.userInfo.mobile || $options.userInfo.email
  }, $options.userInfo.nickname || $options.userInfo.username || $options.userInfo.mobile || $options.userInfo.email ? {
    A: common_vendor.t(_ctx.$t("topwindow.text.changePwd")),
    B: common_vendor.o((...args) => $options.changePassword && $options.changePassword(...args)),
    C: common_vendor.t(_ctx.$t("topwindow.text.signOut")),
    D: common_vendor.o((...args) => $options.logout && $options.logout(...args))
  } : {}, {
    E: !$props.matchLeftWindow ? 1 : "",
    F: $data.popupMenuOpened ? 1 : "",
    G: common_vendor.sr("errorLogsPopup", "b1920ff4-5"),
    H: common_vendor.p({
      type: "center"
    })
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createComponent(Component);
//# sourceMappingURL=../../.sourcemap/mp-weixin/windows/topWindow.js.map
