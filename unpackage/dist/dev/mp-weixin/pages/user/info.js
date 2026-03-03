"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
const _sfc_main = {
  data() {
    return {
      userInfo: uni_modules_uniIdPages_common_store.store.userInfo
      // 从官方 store 获取用户信息
    };
  },
  onShow() {
    this.$refs.udb && this.$refs.udb.loadData({ clear: true });
  },
  computed: {
    addressWhere() {
      if (!this.userInfo || !this.userInfo._id)
        return null;
      return { user_id: this.userInfo._id };
    }
  },
  methods: {
    // 跳转到官方个人资料页（包含头像、昵称、手机绑定、密码修改等）
    goToUserInfo() {
      common_vendor.index.navigateTo({
        url: "/uni_modules/uni-id-pages/pages/userinfo/userinfo"
      });
    },
    // 新增地址
    addAddress() {
      common_vendor.index.navigateTo({
        url: "../address/add",
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    // 编辑地址
    editAddress(id) {
      common_vendor.index.navigateTo({
        url: `../address/edit?id=${id}`,
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    // 删除地址
    deleteAddress(id) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要删除该地址吗？",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "删除中" });
            try {
              const db = common_vendor.tr.database();
              await db.collection("uni-id-address").doc(id).remove();
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "删除成功", icon: "success" });
              this.$refs.udb && this.$refs.udb.loadData({ clear: true });
            } catch (err) {
              common_vendor.index.hideLoading();
              common_vendor.index.showModal({ content: err.message || "删除失败", showCancel: false });
            }
          }
        }
      });
    },
    // 格式化完整地址（如果后台没有存储 formatted_address，可临时拼接）
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
    onAddressLoad(data) {
      common_vendor.index.__f__("log", "at pages/user/info.vue:142", "地址列表加载", data);
    }
  }
};
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _easycom_unicloud_db2 = common_vendor.resolveComponent("unicloud-db");
  (_easycom_uni_icons2 + _easycom_unicloud_db2)();
}
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_unicloud_db = () => "../../node-modules/@dcloudio/uni-components/lib/unicloud-db/unicloud-db.js";
if (!Math) {
  (_easycom_uni_icons + _easycom_unicloud_db)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.userInfo.avatarFile || "/static/default-avatar.png",
    b: common_vendor.t($data.userInfo.nickname || "未设置昵称"),
    c: common_vendor.t($data.userInfo.mobile || "未绑定手机号"),
    d: common_vendor.p({
      type: "arrowright",
      size: "20",
      color: "#999"
    }),
    e: common_vendor.o((...args) => $options.goToUserInfo && $options.goToUserInfo(...args)),
    f: common_vendor.o((...args) => $options.addAddress && $options.addAddress(...args)),
    g: common_vendor.w(({
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
            g: common_vendor.o(($event) => $options.editAddress(item._id), item._id),
            h: "aab93774-2-" + i0 + "-" + i1 + ",aab93774-1",
            i: common_vendor.o(($event) => $options.deleteAddress(item._id), item._id),
            j: "aab93774-3-" + i0 + "-" + i1 + ",aab93774-1",
            k: item._id,
            l: item.is_default ? 1 : ""
          });
        }),
        f: common_vendor.p({
          type: "compose",
          size: "20",
          color: "#666"
        }),
        g: common_vendor.p({
          type: "trash",
          size: "20",
          color: "#666"
        })
      } : {}, {
        c: loading,
        d: data && data.length > 0,
        h: i0,
        i: s0
      });
    }, {
      name: "d",
      path: "g",
      vueId: "aab93774-1"
    }),
    h: common_vendor.sr("udb", "aab93774-1"),
    i: common_vendor.o($options.onAddressLoad),
    j: common_vendor.p({
      collection: "uni-id-address",
      where: $options.addressWhere,
      orderby: "is_default desc, create_date desc"
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-aab93774"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/info.js.map
