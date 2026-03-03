"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
const db = common_vendor.tr.database();
db.command;
const _sfc_main = {
  data() {
    return {
      selectedItems: [],
      preOrderItem: null,
      isPreOrder: false,
      selectedAddress: null,
      remark: "",
      submitting: false,
      totalAmount: 0,
      scoreEarned: 0,
      isAddressManuallySelected: false
    };
  },
  onLoad(options) {
    common_vendor.index.__f__("log", "at pages/order/confirm.vue:81", "confirm onLoad options:", options);
    common_vendor.index.__f__("log", "at pages/order/confirm.vue:82", "preOrderItem cache:", common_vendor.index.getStorageSync("preOrderItem"));
    if (options && options.type === "pre") {
      this.isPreOrder = true;
      const preItem = common_vendor.index.getStorageSync("preOrderItem");
      if (preItem && preItem.good) {
        this.preOrderItem = preItem;
        const total = preItem.good.goods_price * preItem.count;
        this.totalAmount = total / 100;
        this.scoreEarned = Math.ceil(total / 100);
        common_vendor.index.removeStorageSync("preOrderItem");
      } else {
        common_vendor.index.showToast({ title: "预售商品信息丢失", icon: "none" });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      }
    } else {
      const items = common_vendor.index.getStorageSync("selectedCartItems");
      if (!items || items.length === 0) {
        common_vendor.index.showToast({ title: "请先选择商品", icon: "none" });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
        return;
      }
      this.selectedItems = items;
      this.calcTotal();
    }
  },
  onShow() {
    if (!this.isAddressManuallySelected) {
      this.loadDefaultAddress();
    }
  },
  methods: {
    calcTotal() {
      let total = 0;
      this.selectedItems.forEach((item) => {
        if (item.goodsInfo) {
          total += item.goodsInfo.goods_price * item.good_count;
        }
      });
      this.totalAmount = total / 100;
      this.scoreEarned = Math.ceil(total / 100);
    },
    getGoodsImage(item) {
      const info = item.goodsInfo || item.good;
      if (!info)
        return "/static/default-goods.png";
      if (info.goods_swiper_imgs && info.goods_swiper_imgs.length) {
        const first = info.goods_swiper_imgs[0];
        return first.url || first.fileID || "/static/default-goods.png";
      }
      return info.goods_thumb || "/static/default-goods.png";
    },
    formatAddress(addr) {
      return [addr.province_name, addr.city_name, addr.district_name, addr.street_name, addr.address].filter((v) => v).join(" ");
    },
    async loadDefaultAddress() {
      if (!uni_modules_uniIdPages_common_store.store.userInfo || !uni_modules_uniIdPages_common_store.store.userInfo._id)
        return;
      const res = await db.collection("uni-id-address").where({ user_id: uni_modules_uniIdPages_common_store.store.userInfo._id, is_default: true }).get();
      if (res.result.data.length > 0) {
        this.selectedAddress = res.result.data[0];
      } else {
        const res2 = await db.collection("uni-id-address").where({ user_id: uni_modules_uniIdPages_common_store.store.userInfo._id }).orderBy("create_date", "desc").get();
        if (res2.result.data.length > 0) {
          this.selectedAddress = res2.result.data[0];
        } else {
          this.selectedAddress = null;
        }
      }
    },
    addAddress() {
      common_vendor.index.navigateTo({
        url: "../address/add",
        events: {
          refreshData: () => {
            this.isAddressManuallySelected = false;
            this.loadDefaultAddress();
          }
        }
      });
    },
    selectAddress() {
      common_vendor.index.navigateTo({
        url: "/pages/address/select?selectMode=true",
        events: {
          onSelectAddress: (addr) => {
            this.selectedAddress = addr;
            this.isAddressManuallySelected = true;
          }
        }
      });
    },
    async submitOrder() {
      if (!this.selectedAddress) {
        common_vendor.index.showToast({ title: "请选择收货地址", icon: "none" });
        return;
      }
      this.submitting = true;
      common_vendor.index.showLoading({ title: "提交中...", mask: true });
      let selectedItems = [];
      if (this.isPreOrder && this.preOrderItem) {
        selectedItems = [{
          good_id: this.preOrderItem.good._id,
          good_count: this.preOrderItem.count,
          goodsInfo: this.preOrderItem.good
        }];
      } else {
        selectedItems = this.selectedItems;
      }
      try {
        const res = await common_vendor.tr.callFunction({
          name: "createOrder",
          data: {
            userId: uni_modules_uniIdPages_common_store.store.userInfo._id,
            addressId: this.selectedAddress._id,
            selectedItems,
            remark: this.remark,
            isPreOrder: this.isPreOrder
          }
        });
        if (res.result.code === 0) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "订单提交成功", icon: "success" });
          if (!this.isPreOrder) {
            common_vendor.index.removeStorageSync("selectedCartItems");
          }
          setTimeout(() => {
            common_vendor.index.redirectTo({ url: "/pages/order/list" });
          }, 1500);
        } else {
          common_vendor.index.hideLoading();
          common_vendor.index.showModal({ content: res.result.message, showCancel: false });
        }
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/order/confirm.vue:227", "下单失败", err);
        common_vendor.index.showModal({ content: err.message || "下单失败，请重试", showCancel: false });
      } finally {
        this.submitting = false;
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
    d: common_vendor.t($data.selectedAddress.formatted_address || $options.formatAddress($data.selectedAddress)),
    e: common_vendor.o((...args) => $options.selectAddress && $options.selectAddress(...args))
  } : {
    f: common_vendor.o((...args) => $options.addAddress && $options.addAddress(...args))
  }, {
    g: common_vendor.p({
      type: "arrowright",
      size: "18",
      color: "#999"
    }),
    h: $data.isPreOrder && $data.preOrderItem
  }, $data.isPreOrder && $data.preOrderItem ? {
    i: $options.getGoodsImage($data.preOrderItem.good),
    j: common_vendor.t($data.preOrderItem.good.name),
    k: common_vendor.t($data.preOrderItem.good.standard || ""),
    l: common_vendor.t(($data.preOrderItem.good.goods_price / 100).toFixed(2)),
    m: common_vendor.t($data.preOrderItem.count),
    n: common_vendor.t(($data.preOrderItem.good.goods_price * $data.preOrderItem.count / 100).toFixed(2))
  } : {
    o: common_vendor.f($data.selectedItems, (item, k0, i0) => {
      var _a, _b, _c, _d;
      return {
        a: $options.getGoodsImage(item),
        b: common_vendor.t((_a = item.goodsInfo) == null ? void 0 : _a.name),
        c: common_vendor.t(((_b = item.goodsInfo) == null ? void 0 : _b.standard) || ""),
        d: common_vendor.t((((_c = item.goodsInfo) == null ? void 0 : _c.goods_price) / 100).toFixed(2)),
        e: common_vendor.t(item.good_count),
        f: common_vendor.t((((_d = item.goodsInfo) == null ? void 0 : _d.goods_price) * item.good_count / 100).toFixed(2)),
        g: item._id
      };
    })
  }, {
    p: $data.remark,
    q: common_vendor.o(($event) => $data.remark = $event.detail.value),
    r: common_vendor.t($data.totalAmount.toFixed(2)),
    s: common_vendor.t(($data.scoreEarned / 100).toFixed(2)),
    t: common_vendor.o((...args) => $options.submitOrder && $options.submitOrder(...args)),
    v: $data.submitting
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-324e7894"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/order/confirm.js.map
