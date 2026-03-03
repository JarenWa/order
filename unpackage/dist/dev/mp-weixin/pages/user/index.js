"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
const db = common_vendor.tr.database();
const dbCmd = db.command;
const _sfc_main = {
  data() {
    return {
      orderCount: {
        all: 0,
        status0: 0,
        status1: 0,
        status2: 0,
        status3: 0
      },
      pendingScore: 0,
      // 待获积分
      isDev: true,
      userScore: 0
    };
  },
  computed: {
    userInfo() {
      return uni_modules_uniIdPages_common_store.store.userInfo;
    },
    role() {
      return common_vendor.index.getStorageSync("role") || [];
    },
    isAdmin() {
      var _a;
      const role = ((_a = this.userInfo) == null ? void 0 : _a.role) || [];
      common_vendor.index.__f__("log", "at pages/user/index.vue:142", "当前角色:", role);
      return Array.isArray(role) ? role.includes("admin") : role === "admin";
    }
  },
  onShow() {
    if (!this.checkLogin())
      return;
    this.loadOrderCount();
    this.loadUserScore();
  },
  methods: {
    async loadUserScore() {
      var _a;
      const userId = (_a = this.userInfo) == null ? void 0 : _a._id;
      if (!userId)
        return;
      try {
        const res = await db.collection("uni-id-users").doc(userId).field("score").get();
        const userData = res.result.data[0];
        if (userData && userData.score !== void 0) {
          this.userScore = userData.score;
        } else {
          this.userScore = 0;
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/user/index.vue:165", "获取用户积分失败", err);
        this.userScore = 0;
      }
    },
    checkLogin() {
      if (!uni_modules_uniIdPages_common_store.store.userInfo || !uni_modules_uniIdPages_common_store.store.userInfo._id) {
        common_vendor.index.navigateTo({
          url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd",
          fail: () => {
            common_vendor.index.redirectTo({ url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd" });
          }
        });
        return false;
      }
      return true;
    },
    goUserInfo() {
      if (!this.checkLogin())
        return;
      common_vendor.index.navigateTo({ url: "../user/info" });
    },
    goOrderList(status) {
      if (!this.checkLogin())
        return;
      let url = "/pages/order/list";
      if (status !== void 0 && status !== null) {
        url += `?status=${status}`;
      }
      common_vendor.index.navigateTo({ url });
    },
    goAdminPanel() {
      if (!this.checkLogin())
        return;
      common_vendor.index.__f__("log", "at pages/user/index.vue:195", "跳转管理后台");
      common_vendor.index.navigateTo({
        url: "../pages_admin/index/index",
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/user/index.vue:199", "跳转失败", err);
          common_vendor.index.showToast({ title: "管理端页面不存在", icon: "none" });
        }
      });
    },
    async loadOrderCount() {
      var _a;
      const userId = this.userInfo._id;
      if (!userId)
        return;
      try {
        const allRes = await db.collection("uni-pay-orders").where({ user_id: userId }).count();
        const status0Res = await db.collection("uni-pay-orders").where({ user_id: userId, status: 0 }).count();
        const status1Res = await db.collection("uni-pay-orders").where({ user_id: userId, status: 1 }).count();
        const status2Res = await db.collection("uni-pay-orders").where({ user_id: userId, status: 2 }).count();
        const status3Res = await db.collection("uni-pay-orders").where({ user_id: userId, status: 3 }).count();
        this.orderCount = {
          all: allRes.result.total || 0,
          status0: status0Res.result.total || 0,
          status1: status1Res.result.total || 0,
          status2: status2Res.result.total || 0,
          status3: status3Res.result.total || 0
        };
        const pendingRes = await db.collection("uni-pay-orders").where({
          user_id: userId,
          status: dbCmd.in([0, 1])
        }).field("score_earned").get();
        const pendingOrders = ((_a = pendingRes == null ? void 0 : pendingRes.result) == null ? void 0 : _a.data) || [];
        let pendingScore = 0;
        pendingOrders.forEach((item) => {
          pendingScore += item.score_earned;
        });
        this.pendingScore = pendingScore;
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/user/index.vue:241", "加载订单统计失败", err);
      }
    },
    logout() {
      uni_modules_uniIdPages_common_store.mutations.logout();
      common_vendor.index.reLaunch({ url: "/pages/index/index" });
    }
  }
};
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  _easycom_uni_icons2();
}
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
if (!Math) {
  _easycom_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $options.userInfo.avatarFile || "/static/default-avatar.png",
    b: common_vendor.t($options.userInfo.nickname || "未设置昵称"),
    c: common_vendor.t($options.userInfo.mobile || "未绑定手机号"),
    d: common_vendor.p({
      type: "arrowright",
      size: "20",
      color: "#999"
    }),
    e: common_vendor.o((...args) => $options.goUserInfo && $options.goUserInfo(...args)),
    f: common_vendor.t(($data.userScore / 100).toFixed(2)),
    g: common_vendor.t(($data.pendingScore / 100).toFixed(2)),
    h: common_vendor.p({
      type: "list",
      size: "24",
      color: "#007aff"
    }),
    i: common_vendor.t($data.orderCount.all || 0),
    j: common_vendor.o(($event) => $options.goOrderList()),
    k: common_vendor.p({
      type: "paperplane",
      size: "24",
      color: "#ff9800"
    }),
    l: common_vendor.t($data.orderCount.status0 || 0),
    m: common_vendor.o(($event) => $options.goOrderList(0)),
    n: common_vendor.p({
      type: "car",
      size: "24",
      color: "#2196f3"
    }),
    o: common_vendor.t($data.orderCount.status1 || 0),
    p: common_vendor.o(($event) => $options.goOrderList(1)),
    q: common_vendor.p({
      type: "checkmarkempty",
      size: "24",
      color: "#4caf50"
    }),
    r: common_vendor.t($data.orderCount.status2 || 0),
    s: common_vendor.o(($event) => $options.goOrderList(2)),
    t: common_vendor.p({
      type: "close",
      size: "24",
      color: "#f44336"
    }),
    v: common_vendor.t($data.orderCount.status3 || 0),
    w: common_vendor.o(($event) => $options.goOrderList(3)),
    x: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#999"
    }),
    y: common_vendor.o((...args) => $options.goUserInfo && $options.goUserInfo(...args)),
    z: $options.isAdmin
  }, $options.isAdmin ? {
    A: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#999"
    }),
    B: common_vendor.o((...args) => $options.goAdminPanel && $options.goAdminPanel(...args))
  } : {}, {
    C: common_vendor.o((...args) => $options.logout && $options.logout(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-79e6a490"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/index.js.map
