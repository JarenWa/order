"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      orderId: "",
      originalOrder: null,
      selectedAddress: null,
      remark: ""
    };
  },
  onLoad(options) {
    if (!options.id) {
      common_vendor.index.showToast({ title: "参数错误", icon: "none" });
      setTimeout(() => common_vendor.index.navigateBack(), 1500);
      return;
    }
    this.orderId = options.id;
    this.loadOrderDetail();
  },
  methods: {
    async loadOrderDetail() {
      common_vendor.index.showLoading({ title: "加载中..." });
      try {
        const res = await db.collection("uni-pay-orders").doc(this.orderId).get();
        const order = res.result.data[0];
        if (!order) {
          common_vendor.index.showToast({ title: "订单不存在", icon: "none" });
          setTimeout(() => common_vendor.index.navigateBack(), 1500);
          return;
        }
        if (order.status !== 0) {
          common_vendor.index.showToast({ title: "当前状态不可修改", icon: "none" });
          setTimeout(() => common_vendor.index.navigateBack(), 1500);
          return;
        }
        if (order.user_id !== uni_modules_uniIdPages_common_store.store.userInfo._id) {
          common_vendor.index.showToast({ title: "无权操作", icon: "none" });
          setTimeout(() => common_vendor.index.navigateBack(), 1500);
          return;
        }
        this.originalOrder = order;
        this.remark = order.remark || "";
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/order/edit.vue:75", "加载订单失败", err);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      } finally {
        common_vendor.index.hideLoading();
      }
    },
    formatAddress(addr) {
      return [addr.province_name, addr.city_name, addr.district_name, addr.street_name, addr.address].filter((v) => v).join(" ");
    },
    selectAddress() {
      common_vendor.index.navigateTo({
        url: "/pages/address/select?selectMode=true",
        events: {
          onSelectAddress: (addr) => {
            this.selectedAddress = addr;
          }
        }
      });
    },
    async submitEdit() {
      if (!this.selectedAddress) {
        common_vendor.index.showToast({ title: "请选择收货地址", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "保存中..." });
      try {
        const updateData = {
          consignee: this.selectedAddress.name,
          mobile: this.selectedAddress.mobile,
          address: this.selectedAddress.formatted_address || this.formatAddress(this.selectedAddress),
          remark: this.remark,
          update_date: Date.now()
        };
        await db.collection("uni-pay-orders").doc(this.orderId).update(updateData);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "修改成功", icon: "success" });
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit("refreshData");
        setTimeout(() => common_vendor.index.navigateBack(), 500);
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/order/edit.vue:117", "修改订单失败", err);
        common_vendor.index.showModal({ content: err.message || "保存失败", showCancel: false });
      }
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
    a: $data.selectedAddress
  }, $data.selectedAddress ? {
    b: common_vendor.t($data.selectedAddress.name),
    c: common_vendor.t($data.selectedAddress.mobile),
    d: common_vendor.t($data.selectedAddress.formatted_address || $options.formatAddress($data.selectedAddress))
  } : {}, {
    e: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#999"
    }),
    f: common_vendor.o((...args) => $options.selectAddress && $options.selectAddress(...args)),
    g: $data.remark,
    h: common_vendor.o(($event) => $data.remark = $event.detail.value),
    i: common_vendor.o((...args) => $options.submitEdit && $options.submitEdit(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-9a0281d8"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/order/edit.js.map
