"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      userInfo: uni_modules_uniIdPages_common_store.store.userInfo,
      cartList: [],
      // 存储带商品详情的购物车数据
      goodsMap: {}
      // 商品ID -> 商品信息映射
    };
  },
  computed: {
    // 全选状态
    allSelected() {
      if (this.cartList.length === 0)
        return false;
      return this.cartList.every((item) => item.good_state);
    },
    // 选中商品数量
    selectedCount() {
      return this.cartList.filter((item) => item.good_state).length;
    },
    // 选中商品总价
    totalPrice() {
      return this.cartList.reduce((sum, item) => {
        if (item.good_state && item.goodsInfo) {
          sum += item.goodsInfo.goods_price / 100 * item.good_count;
        }
        return sum;
      }, 0);
    }
  },
  onLoad() {
    if (!this.userInfo || !this.userInfo._id) {
      common_vendor.index.navigateTo({ url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd" });
    }
    common_vendor.index.$on("cartUpdated", () => {
      this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    });
  },
  onUnload() {
    common_vendor.index.$off("cartUpdated");
  },
  methods: {
    // 商品详情
    goGoodsDetail(id) {
      common_vendor.index.navigateTo({ url: `/pages/goods/detail?id=${id}` });
    },
    getImageSrc(item) {
      if (item._imgError || !item.goods_swiper_imgs || !item.goods_swiper_imgs.length) {
        return "/static/tab/goods-default.png";
      }
      const firstImg = item.goods_swiper_imgs[0];
      return firstImg.url || firstImg.fileID || "/static/tab/goods-default.png";
    },
    onImageError(item) {
      item._imgError = true;
    },
    // 购物车数据加载后，批量查询商品详情
    async onCartLoad(data) {
      if (!data || data.length === 0)
        return;
      const goodsIds = data.map((item) => item.good_id).filter((id) => id);
      if (goodsIds.length === 0)
        return;
      try {
        const res = await db.collection("opendb-mall-goods").where({ _id: db.command.in(goodsIds) }).field("_id,name,standard,goods_price,goods_swiper_imgs").get();
        const goodsMap = {};
        res.result.data.forEach((g) => {
          goodsMap[g._id] = g;
        });
        this.cartList = data.map((item) => ({
          ...item,
          goodsInfo: goodsMap[item.good_id] || null
        }));
        this.goodsMap = goodsMap;
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/cart/index.vue:140", "加载商品详情失败", err);
      }
    },
    // 切换单个选中
    toggleSelect(item) {
      const newState = !item.good_state;
      db.collection("my_cart").doc(item._id).update({ good_state: newState }).then(() => {
        item.good_state = newState;
        this.$forceUpdate();
      }).catch((err) => {
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      });
    },
    // 全选/取消全选
    toggleAll() {
      const newState = !this.allSelected;
      const ids = this.cartList.map((item) => item._id);
      Promise.all(ids.map((id) => db.collection("my_cart").doc(id).update({ good_state: newState }))).then(() => {
        this.cartList.forEach((item) => item.good_state = newState);
        this.$forceUpdate();
      }).catch((err) => {
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      });
    },
    // 更新数量
    updateQuantity(item, newCount) {
      if (newCount === item.good_count)
        return;
      db.collection("my_cart").doc(item._id).update({ good_count: newCount }).then(() => {
        item.good_count = newCount;
        this.$forceUpdate();
      }).catch((err) => {
        common_vendor.index.showModal({ content: err.message || "操作失败", showCancel: false });
      });
    },
    // 删除商品
    deleteItem(id) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要删除该商品吗？",
        success: (res) => {
          if (res.confirm) {
            db.collection("my_cart").doc(id).remove().then(() => {
              this.cartList = this.cartList.filter((item) => item._id !== id);
              this.$forceUpdate();
              common_vendor.index.showToast({ title: "删除成功", icon: "success" });
            }).catch((err) => {
              common_vendor.index.showModal({ content: err.message || "删除失败", showCancel: false });
            });
          }
        }
      });
    },
    // 结算
    settle() {
      const selected = this.cartList.filter((item) => item.good_state);
      if (selected.length === 0) {
        common_vendor.index.showToast({ title: "请选择要下单的商品", icon: "none" });
        return;
      }
      common_vendor.index.setStorageSync("selectedCartItems", selected);
      common_vendor.index.navigateTo({ url: "/pages/order/confirm" });
    }
  }
};
if (!Array) {
  const _easycom_uni_number_box2 = common_vendor.resolveComponent("uni-number-box");
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _easycom_unicloud_db2 = common_vendor.resolveComponent("unicloud-db");
  (_easycom_uni_number_box2 + _easycom_uni_icons2 + _easycom_unicloud_db2)();
}
const _easycom_uni_number_box = () => "../../uni_modules/uni-number-box/components/uni-number-box/uni-number-box.js";
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_unicloud_db = () => "../../node-modules/@dcloudio/uni-components/lib/unicloud-db/unicloud-db.js";
if (!Math) {
  (_easycom_uni_number_box + _easycom_uni_icons + _easycom_unicloud_db)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.w(({
      data,
      loading,
      error
    }, s0, i0) => {
      return common_vendor.e({
        a: error
      }, error ? {
        b: common_vendor.t(error.message)
      } : loading ? {} : data && data.length > 0 ? {
        e: common_vendor.f($data.cartList, (item, k1, i1) => {
          var _a, _b, _c;
          return {
            a: item.good_state,
            b: common_vendor.o(($event) => $options.toggleSelect(item), item._id),
            c: $options.getImageSrc(item.goodsInfo),
            d: common_vendor.o(($event) => $options.onImageError(item), item._id),
            e: common_vendor.o(($event) => $options.goGoodsDetail(item.good_id), item._id),
            f: common_vendor.t(((_a = item.goodsInfo) == null ? void 0 : _a.name) || "-"),
            g: common_vendor.t(((_b = item.goodsInfo) == null ? void 0 : _b.standard) || "-"),
            h: common_vendor.t((((_c = item.goodsInfo) == null ? void 0 : _c.goods_price) / 100).toFixed(2) || "0.00"),
            i: common_vendor.o((val) => $options.updateQuantity(item, val), item._id),
            j: "8039fbf1-1-" + i0 + "-" + i1 + ",8039fbf1-0",
            k: common_vendor.p({
              value: item.good_count,
              min: 1,
              max: 10
            }),
            l: common_vendor.o(($event) => $options.deleteItem(item._id), item._id),
            m: "8039fbf1-2-" + i0 + "-" + i1 + ",8039fbf1-0",
            n: item._id
          };
        }),
        f: common_vendor.p({
          type: "trash",
          size: "20",
          color: "#999"
        })
      } : {}, {
        c: loading,
        d: data && data.length > 0,
        g: i0,
        h: s0
      });
    }, {
      name: "d",
      path: "a",
      vueId: "8039fbf1-0"
    }),
    b: common_vendor.sr("udb", "8039fbf1-0"),
    c: common_vendor.o($options.onCartLoad),
    d: common_vendor.p({
      collection: "my_cart",
      where: `user_id == '${$data.userInfo._id}'`,
      getone: false,
      getcount: true
    }),
    e: $options.allSelected,
    f: common_vendor.o((...args) => $options.toggleAll && $options.toggleAll(...args)),
    g: common_vendor.t($options.totalPrice.toFixed(2)),
    h: common_vendor.t($options.selectedCount),
    i: common_vendor.o((...args) => $options.settle && $options.settle(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8039fbf1"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/cart/index.js.map
