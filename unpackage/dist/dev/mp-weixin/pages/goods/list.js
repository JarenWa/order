"use strict";
const common_vendor = require("../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../uni_modules/uni-id-pages/common/store.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      collectionList: "opendb-mall-goods",
      // 搜索
      searchInput: "",
      searchText: "",
      // 状态筛选（原 filterOptions）
      statusOptions: ["全部标签", "热销", "新品", "下架"],
      statusIndex: 0,
      statusType: "all",
      // 对应 'all', 'hot', 'new', 'off'
      // 类别筛选
      categoryOptions: [{ value: "", text: "全部分类" }],
      // 初始时包含全部分类
      categoryIndex: 0,
      categoryValue: "",
      // 当前选中的分类ID，''表示全部
      // 分类映射（用于显示分类名称）
      categoryMap: {},
      // 当前选中加入购物车的商品
      selectedGood: null,
      selectedCount: 1,
      currentStock: 0,
      // 当前选中商品的库存
      cartCount: 0,
      // 该用户该商品已在购物车中的数量
      availableStock: 0
      // 剩余可加数量 = 库存 - 购物车数量
    };
  },
  computed: {
    whereCondition() {
      const condition = {};
      if (this.searchText) {
        condition.name = new RegExp(this.searchText, "i");
      }
      switch (this.statusType) {
        case "hot":
          condition.is_hot = true;
          break;
        case "new":
          condition.is_new = true;
          break;
        case "off":
          condition.is_on_sale = false;
          break;
      }
      if (this.categoryValue) {
        condition.category = this.categoryValue;
      }
      return condition;
    }
  },
  onLoad() {
    this.loadAllCategories();
  },
  onPullDownRefresh() {
    this.$refs.udb.loadData({ clear: true }, () => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  onReachBottom() {
    this.$refs.udb.loadMore();
  },
  methods: {
    // 预加载全部分类（构造类别菜单和分类映射）
    async loadAllCategories() {
      try {
        const db2 = common_vendor.tr.databaseForJQL();
        const res = await db2.collection("opendb-mall-categories").field("_id, name").get();
        if (res && Array.isArray(res.data)) {
          res.data.forEach((cat) => {
            this.categoryMap[cat._id] = cat.name;
          });
          this.categoryOptions = [{ value: "", text: "全部分类" }];
          res.data.forEach((cat) => {
            this.categoryOptions.push({ value: cat._id, text: cat.name });
          });
          common_vendor.index.__f__("log", "at pages/goods/list.vue:213", "分类菜单加载完成", this.categoryOptions);
        } else {
          common_vendor.index.__f__("warn", "at pages/goods/list.vue:215", "分类加载返回格式异常", res);
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/goods/list.vue:218", "加载分类失败", err);
      }
    },
    // 根据分类ID获取名称（用于列表显示）
    getCategoryName(catId) {
      if (!catId)
        return "-";
      return this.categoryMap[catId] || "-";
    },
    // 状态筛选变更
    onStatusFilterChange(e) {
      this.statusIndex = e.detail.value;
      const types = ["all", "hot", "new", "off"];
      this.statusType = types[this.statusIndex];
    },
    // 类别筛选变更
    onCategoryFilterChange(e) {
      this.categoryIndex = e.detail.value;
      this.categoryValue = this.categoryOptions[this.categoryIndex].value;
    },
    // 搜索
    onSearch() {
      this.searchText = this.searchInput;
    },
    // 数据加载完成后的处理（可选）
    onDataLoad(data) {
      common_vendor.index.__f__("log", "at pages/goods/list.vue:248", "商品数据加载", data);
    },
    getImageSrc(item) {
      if (item._imgError || !item.goods_swiper_imgs || !item.goods_swiper_imgs.length) {
        return "/static/tab/goods-default.png";
      }
      const firstImg = item.goods_swiper_imgs[0];
      return firstImg.url || firstImg.fileID || "/static/tab/goods.png";
    },
    onImageError(item) {
      item._imgError = true;
    },
    handleItemClick(id) {
      common_vendor.index.navigateTo({
        url: "./detail?id=" + id,
        events: {
          refreshData: () => {
            this.$refs.udb.loadData({ clear: true });
          }
        }
      });
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
    closePopup() {
      this.$refs.popup.close();
    },
    // 查询购物车中该商品的数量
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
        common_vendor.index.__f__("error", "at pages/goods/list.vue:302", "查询购物车失败", err);
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
        common_vendor.index.__f__("error", "at pages/goods/list.vue:348", "加入购物车失败", err);
        common_vendor.index.showModal({ content: err.message || "加入失败", showCancel: false });
      }
    }
  }
};
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _easycom_uni_list_item2 = common_vendor.resolveComponent("uni-list-item");
  const _easycom_uni_list2 = common_vendor.resolveComponent("uni-list");
  const _easycom_uni_load_more2 = common_vendor.resolveComponent("uni-load-more");
  const _easycom_unicloud_db2 = common_vendor.resolveComponent("unicloud-db");
  const _easycom_uni_number_box2 = common_vendor.resolveComponent("uni-number-box");
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  (_easycom_uni_icons2 + _easycom_uni_list_item2 + _easycom_uni_list2 + _easycom_uni_load_more2 + _easycom_unicloud_db2 + _easycom_uni_number_box2 + _easycom_uni_popup2)();
}
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_uni_list_item = () => "../../uni_modules/uni-list/components/uni-list-item/uni-list-item.js";
const _easycom_uni_list = () => "../../uni_modules/uni-list/components/uni-list/uni-list.js";
const _easycom_uni_load_more = () => "../../uni_modules/uni-load-more/components/uni-load-more/uni-load-more.js";
const _easycom_unicloud_db = () => "../../node-modules/@dcloudio/uni-components/lib/unicloud-db/unicloud-db.js";
const _easycom_uni_number_box = () => "../../uni_modules/uni-number-box/components/uni-number-box/uni-number-box.js";
const _easycom_uni_popup = () => "../../uni_modules/uni-popup/components/uni-popup/uni-popup.js";
if (!Math) {
  (_easycom_uni_icons + _easycom_uni_list_item + _easycom_uni_list + _easycom_uni_load_more + _easycom_unicloud_db + _easycom_uni_number_box + _easycom_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.statusOptions[$data.statusIndex]),
    b: common_vendor.o((...args) => $options.onStatusFilterChange && $options.onStatusFilterChange(...args)),
    c: $data.statusIndex,
    d: $data.statusOptions,
    e: common_vendor.o((...args) => $options.onSearch && $options.onSearch(...args)),
    f: $data.searchInput,
    g: common_vendor.o(($event) => $data.searchInput = $event.detail.value),
    h: common_vendor.o((...args) => $options.onSearch && $options.onSearch(...args)),
    i: common_vendor.t($data.categoryOptions[$data.categoryIndex].text),
    j: common_vendor.o((...args) => $options.onCategoryFilterChange && $options.onCategoryFilterChange(...args)),
    k: $data.categoryIndex,
    l: $data.categoryOptions,
    m: common_vendor.w(({
      data,
      pagination,
      loading,
      hasMore,
      error
    }, s0, i0) => {
      return common_vendor.e({
        a: error
      }, error ? {
        b: common_vendor.t(error.message)
      } : data ? {
        d: common_vendor.f(data, (item, index, i1) => {
          return common_vendor.e({
            a: $options.getImageSrc(item),
            b: common_vendor.o(($event) => $options.onImageError(item), index),
            c: common_vendor.t(item.name),
            d: common_vendor.t((item.goods_price / 100).toFixed(2)),
            e: common_vendor.t(item.remain_count),
            f: common_vendor.t(item.standard),
            g: common_vendor.t($options.getCategoryName(item.category)),
            h: common_vendor.t(item.production_date || "-"),
            i: common_vendor.t(item.shelf_life_months != null ? item.shelf_life_months + "个月" : "-"),
            j: item.is_hot
          }, item.is_hot ? {} : {}, {
            k: item.is_new
          }, item.is_new ? {} : {}, {
            l: !item.is_on_sale
          }, !item.is_on_sale ? {} : {}, {
            m: "7f2f18c6-3-" + i0 + "-" + i1 + "," + ("7f2f18c6-2-" + i0 + "-" + i1),
            n: common_vendor.o(($event) => $options.showAddToCart(item), index),
            o: index,
            p: common_vendor.o(($event) => $options.handleItemClick(item._id), index),
            q: "7f2f18c6-2-" + i0 + "-" + i1 + "," + ("7f2f18c6-1-" + i0)
          });
        }),
        e: common_vendor.p({
          type: "plusempty",
          size: "20",
          color: "#ffffff"
        }),
        f: common_vendor.p({
          showArrow: true,
          clickable: true
        }),
        g: "7f2f18c6-1-" + i0 + ",7f2f18c6-0"
      } : {}, {
        c: data,
        h: "7f2f18c6-4-" + i0 + ",7f2f18c6-0",
        i: common_vendor.p({
          status: loading ? "loading" : hasMore ? "more" : "noMore"
        }),
        j: i0,
        k: s0
      });
    }, {
      name: "d",
      path: "m",
      vueId: "7f2f18c6-0"
    }),
    n: common_vendor.sr("udb", "7f2f18c6-0"),
    o: common_vendor.o($options.onDataLoad),
    p: common_vendor.p({
      collection: $data.collectionList,
      ["page-size"]: 20,
      where: $options.whereCondition,
      field: "name,remain_count,goods_price,standard,category,goods_swiper_imgs,is_hot,is_new,is_on_sale,production_date,shelf_life_months"
    }),
    q: common_vendor.t($data.availableStock),
    r: common_vendor.t($data.currentStock),
    s: common_vendor.t($data.cartCount),
    t: common_vendor.o(($event) => $data.selectedCount = $event),
    v: common_vendor.p({
      min: 1,
      max: 99999,
      modelValue: $data.selectedCount
    }),
    w: common_vendor.o((...args) => $options.closePopup && $options.closePopup(...args)),
    x: common_vendor.o((...args) => $options.addToCart && $options.addToCart(...args)),
    y: $data.availableStock <= 0,
    z: common_vendor.o(() => {
    }),
    A: common_vendor.sr("popup", "7f2f18c6-5"),
    B: common_vendor.p({
      type: "center"
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7f2f18c6"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/goods/list.js.map
