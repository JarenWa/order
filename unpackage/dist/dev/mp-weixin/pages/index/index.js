"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      hotGoods: [],
      newGoods: [],
      preGoods: [],
      hotLoading: false,
      newLoading: false,
      preLoading: false,
      selectedGood: null,
      // 当前选中的商品
      selectedCount: 1,
      // 选择的购买数量
      currentStock: 0,
      // 当前选中商品的库存
      cartCount: 0,
      // 该用户该商品已在购物车中的数量
      availableStock: 0
      // 剩余可加数量 = 库存 - 购物车数量
    };
  },
  onLoad() {
    this.loadPreGoods();
    this.loadHotGoods();
    this.loadNewGoods();
  },
  methods: {
    // 加载预售商品
    async loadPreGoods() {
      this.preLoading = true;
      try {
        const res = await db.collection("opendb-mall-goods").where({ is_pre: true, is_on_sale: true }).field("name,standard,goods_desc,goods_price,goods_swiper_imgs,remain_count").orderBy("create_date", "desc").limit(10).get();
        this.preGoods = res.result.data;
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:139", "加载预售商品失败", err);
      } finally {
        this.preLoading = false;
      }
    },
    // 加载热销商品
    async loadHotGoods() {
      this.hotLoading = true;
      try {
        const res = await db.collection("opendb-mall-goods").where({ is_hot: true, is_on_sale: true, is_pre: null }).field("name,standard,goods_price,goods_swiper_imgs,remain_count").orderBy("create_date", "desc").limit(10).get();
        this.hotGoods = res.result.data;
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:156", "加载热销商品失败", err);
      } finally {
        this.hotLoading = false;
      }
    },
    // 加载新品
    async loadNewGoods() {
      this.newLoading = true;
      try {
        const res = await db.collection("opendb-mall-goods").where({ is_new: true, is_on_sale: true, is_pre: null }).field("name,standard,goods_price,goods_thumb,goods_swiper_imgs,remain_count").orderBy("create_date", "desc").limit(10).get();
        this.newGoods = res.result.data;
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:173", "加载新品失败", err);
      } finally {
        this.newLoading = false;
      }
    },
    // 获取商品首图
    getGoodsImage(item) {
      if (item.goods_swiper_imgs && item.goods_swiper_imgs.length) {
        const first = item.goods_swiper_imgs[0];
        return first.url || first.fileID || "/static/default-goods.png";
      }
      return item.goods_thumb || "/static/default-goods.png";
    },
    // 商品详情
    goGoodsDetail(id) {
      common_vendor.index.navigateTo({ url: `/pages/goods/detail?id=${id}` });
    },
    // ========== 普通商品加购逻辑 ==========
    showAddToCart(goods) {
      if (!uni_modules_uniIdPages_common_store.store.userInfo || !uni_modules_uniIdPages_common_store.store.userInfo._id) {
        common_vendor.index.navigateTo({ url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd" });
        return;
      }
      this.selectedGood = goods;
      this.currentStock = goods.remain_count || 0;
      this.selectedCount = 1;
      this.getCartCount(goods._id).then((cartCount) => {
        this.cartCount = cartCount;
        this.availableStock = this.currentStock - cartCount;
        this.$refs.popup.open();
      });
    },
    async getCartCount(goodId) {
      const userInfo = uni_modules_uniIdPages_common_store.store.userInfo;
      if (!userInfo)
        return 0;
      try {
        const res = await db.collection("my_cart").where({ user_id: userInfo._id, good_id: goodId }).get();
        if (res.result.data.length > 0) {
          return res.result.data[0].good_count;
        }
        return 0;
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:218", "查询购物车失败", err);
        return 0;
      }
    },
    async addToCart() {
      if (!this.selectedGood)
        return;
      const userInfo = uni_modules_uniIdPages_common_store.store.userInfo;
      if (!userInfo || !userInfo._id) {
        common_vendor.index.showToast({ title: "请先登录", icon: "none" });
        return;
      }
      if (this.selectedCount > this.availableStock) {
        common_vendor.index.showModal({
          title: "提示",
          content: `最多还可添加 ${this.availableStock} 件`,
          showCancel: false
        });
        return;
      }
      this.closePopup();
      common_vendor.index.showLoading({ title: "加入中..." });
      try {
        const cartRes = await db.collection("my_cart").where({ user_id: userInfo._id, good_id: this.selectedGood._id }).get();
        const totalCount = this.cartCount + this.selectedCount;
        if (cartRes.result.data.length > 0) {
          const cartItem = cartRes.result.data[0];
          await db.collection("my_cart").doc(cartItem._id).update({
            good_count: totalCount
          });
        } else {
          await db.collection("my_cart").add({
            good_count: this.selectedCount,
            good_state: true,
            user_id: userInfo._id,
            good_id: this.selectedGood._id
          });
        }
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "已加入购物车", icon: "success" });
        common_vendor.index.$emit("cartUpdated");
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/index/index.vue:263", "加入购物车失败", err);
        common_vendor.index.showModal({ content: err.message || "加入失败", showCancel: false });
      }
    },
    closePopup() {
      this.$refs.popup.close();
    },
    // ========== 预售商品下单逻辑 ==========
    showPreOrder(goods) {
      if (!uni_modules_uniIdPages_common_store.store.userInfo || !uni_modules_uniIdPages_common_store.store.userInfo._id) {
        common_vendor.index.navigateTo({ url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd" });
        return;
      }
      this.selectedGood = goods;
      this.currentStock = goods.remain_count || 0;
      this.selectedCount = 1;
      this.$refs.prePopup.open();
    },
    goPreOrder() {
      if (!this.selectedGood)
        return;
      if (this.selectedCount > this.currentStock) {
        common_vendor.index.showModal({
          title: "提示",
          content: `库存仅剩 ${this.currentStock} 件`,
          showCancel: false
        });
        return;
      }
      this.closePrePopup();
      common_vendor.index.setStorageSync("preOrderItem", {
        good: this.selectedGood,
        count: this.selectedCount
      });
      common_vendor.index.navigateTo({ url: "/pages/order/confirm?type=pre" });
    },
    closePrePopup() {
      this.$refs.prePopup.close();
    }
  }
};
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _easycom_uni_load_more2 = common_vendor.resolveComponent("uni-load-more");
  const _easycom_uni_number_box2 = common_vendor.resolveComponent("uni-number-box");
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  (_easycom_uni_icons2 + _easycom_uni_load_more2 + _easycom_uni_number_box2 + _easycom_uni_popup2)();
}
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_uni_load_more = () => "../../uni_modules/uni-load-more/components/uni-load-more/uni-load-more.js";
const _easycom_uni_number_box = () => "../../uni_modules/uni-number-box/components/uni-number-box/uni-number-box.js";
const _easycom_uni_popup = () => "../../uni_modules/uni-popup/components/uni-popup/uni-popup.js";
if (!Math) {
  (_easycom_uni_icons + _easycom_uni_load_more + _easycom_uni_number_box + _easycom_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($data.preGoods, (item, k0, i0) => {
      return {
        a: $options.getGoodsImage(item),
        b: common_vendor.t(item.name),
        c: common_vendor.t(item.standard),
        d: common_vendor.t(item.goods_desc),
        e: common_vendor.t((item.goods_price / 100).toFixed(2)),
        f: "1cf27b2a-0-" + i0,
        g: common_vendor.o(($event) => $options.showPreOrder(item), item._id),
        h: common_vendor.o(($event) => $options.goGoodsDetail(item._id), item._id),
        i: item._id
      };
    }),
    b: common_vendor.p({
      type: "plusempty",
      size: "20",
      color: "#ffffff"
    }),
    c: $data.preLoading
  }, $data.preLoading ? {
    d: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    e: common_vendor.f($data.newGoods, (item, k0, i0) => {
      return {
        a: $options.getGoodsImage(item),
        b: common_vendor.t(item.name),
        c: common_vendor.t(item.standard),
        d: common_vendor.t((item.goods_price / 100).toFixed(2)),
        e: "1cf27b2a-2-" + i0,
        f: common_vendor.o(($event) => $options.showAddToCart(item), item._id),
        g: common_vendor.o(($event) => $options.goGoodsDetail(item._id), item._id),
        h: item._id
      };
    }),
    f: common_vendor.p({
      type: "plusempty",
      size: "20",
      color: "#ffffff"
    }),
    g: $data.newLoading
  }, $data.newLoading ? {
    h: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    i: common_vendor.f($data.hotGoods, (item, k0, i0) => {
      return {
        a: $options.getGoodsImage(item),
        b: common_vendor.t(item.name),
        c: common_vendor.t(item.standard),
        d: common_vendor.t((item.goods_price / 100).toFixed(2)),
        e: "1cf27b2a-4-" + i0,
        f: common_vendor.o(($event) => $options.showAddToCart(item), item._id),
        g: common_vendor.o(($event) => $options.goGoodsDetail(item._id), item._id),
        h: item._id
      };
    }),
    j: common_vendor.p({
      type: "plusempty",
      size: "20",
      color: "#ffffff"
    }),
    k: $data.hotLoading
  }, $data.hotLoading ? {
    l: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    m: common_vendor.t($data.availableStock),
    n: common_vendor.t($data.currentStock),
    o: common_vendor.t($data.cartCount),
    p: common_vendor.o(($event) => $data.selectedCount = $event),
    q: common_vendor.p({
      min: 1,
      max: 99999,
      modelValue: $data.selectedCount
    }),
    r: common_vendor.o((...args) => $options.closePopup && $options.closePopup(...args)),
    s: common_vendor.o((...args) => $options.addToCart && $options.addToCart(...args)),
    t: $data.availableStock <= 0,
    v: common_vendor.o(() => {
    }),
    w: common_vendor.sr("popup", "1cf27b2a-6"),
    x: common_vendor.p({
      type: "center"
    }),
    y: common_vendor.t($data.currentStock),
    z: common_vendor.o(($event) => $data.selectedCount = $event),
    A: common_vendor.p({
      min: 1,
      max: 99999,
      modelValue: $data.selectedCount
    }),
    B: common_vendor.o((...args) => $options.closePrePopup && $options.closePrePopup(...args)),
    C: common_vendor.o((...args) => $options.goPreOrder && $options.goPreOrder(...args)),
    D: common_vendor.o(() => {
    }),
    E: common_vendor.sr("prePopup", "1cf27b2a-8"),
    F: common_vendor.p({
      type: "center"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
