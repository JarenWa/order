"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      loading: false,
      error: null,
      data: null,
      _listChannel: null,
      categoryMap: {}
      // 新增：存储分类ID到名称的映射
    };
  },
  onLoad(e) {
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel) {
      this._listChannel = eventChannel;
    }
    this._id = e.id;
    this.loadData();
    this.loadAllCategories();
  },
  methods: {
    // 加载全部分类（与 list.vue 一致）
    async loadAllCategories() {
      try {
        const dbJql = common_vendor.tr.databaseForJQL();
        const res = await dbJql.collection("opendb-mall-categories").field("_id, name").get();
        if (res && Array.isArray(res.data)) {
          res.data.forEach((cat) => {
            this.categoryMap[cat._id] = cat.name;
          });
          common_vendor.index.__f__("log", "at pages/goods/detail.vue:110", "分类映射加载完成", this.categoryMap);
        } else {
          common_vendor.index.__f__("warn", "at pages/goods/detail.vue:112", "分类加载返回格式异常", res);
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/goods/detail.vue:115", "加载分类失败", err);
      }
    },
    // 根据分类ID获取名称
    getCategoryName(catId) {
      if (!catId)
        return "未分类";
      return this.categoryMap[catId] || "未分类";
    },
    formatDate(timestamp) {
      if (!timestamp)
        return "-";
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    loadData() {
      this.loading = true;
      db.collection("opendb-mall-goods").doc(this._id).get().then((res) => {
        this.data = res.result.data[0];
      }).catch((err) => {
        this.error = err;
      }).finally(() => {
        this.loading = false;
      });
    },
    formatImages(imgs) {
      if (!imgs || !Array.isArray(imgs))
        return [];
      return imgs.map((item) => {
        if (typeof item === "string") {
          return { url: item };
        }
        return item;
      });
    },
    previewImage(imgs, index) {
      const urls = imgs.map((img) => img.url || img);
      common_vendor.index.previewImage({ current: index, urls });
    }
  }
};
if (!Array) {
  const _easycom_uni_load_more2 = common_vendor.resolveComponent("uni-load-more");
  const _easycom_uni_list_item2 = common_vendor.resolveComponent("uni-list-item");
  const _easycom_uni_list2 = common_vendor.resolveComponent("uni-list");
  const _easycom_uni_card2 = common_vendor.resolveComponent("uni-card");
  (_easycom_uni_load_more2 + _easycom_uni_list_item2 + _easycom_uni_list2 + _easycom_uni_card2)();
}
const _easycom_uni_load_more = () => "../../uni_modules/uni-load-more/components/uni-load-more/uni-load-more.js";
const _easycom_uni_list_item = () => "../../uni_modules/uni-list/components/uni-list-item/uni-list-item.js";
const _easycom_uni_list = () => "../../uni_modules/uni-list/components/uni-list/uni-list.js";
const _easycom_uni_card = () => "../../uni_modules/uni-card/components/uni-card/uni-card.js";
if (!Math) {
  (_easycom_uni_load_more + _easycom_uni_list_item + _easycom_uni_list + _easycom_uni_card)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {
    b: common_vendor.p({
      status: "loading"
    })
  } : $data.error ? {
    d: common_vendor.t($data.error.message)
  } : $data.data ? common_vendor.e({
    f: common_vendor.p({
      title: "商品名称",
      ["right-text"]: $data.data.name
    }),
    g: common_vendor.p({
      title: "库存数量",
      ["right-text"]: String($data.data.remain_count)
    }),
    h: common_vendor.p({
      title: "价格(元)",
      ["right-text"]: String(($data.data.goods_price / 100).toFixed(2))
    }),
    i: common_vendor.p({
      title: "商品简介",
      ["right-text"]: $data.data.goods_desc || "无"
    }),
    j: common_vendor.p({
      title: "商品规格",
      ["right-text"]: $data.data.standard || "无"
    }),
    k: common_vendor.p({
      title: "商品类别",
      ["right-text"]: $options.getCategoryName($data.data.category)
    }),
    l: common_vendor.p({
      title: "基本信息",
      ["is-shadow"]: true,
      margin: "10px 0"
    }),
    m: common_vendor.f($options.formatImages($data.data.goods_swiper_imgs), (img, index, i0) => {
      return {
        a: img.url || img,
        b: common_vendor.o(($event) => $options.previewImage($options.formatImages($data.data.goods_swiper_imgs), index), index),
        c: index
      };
    }),
    n: !$options.formatImages($data.data.goods_swiper_imgs).length
  }, !$options.formatImages($data.data.goods_swiper_imgs).length ? {} : {}, {
    o: common_vendor.p({
      title: "轮播图",
      ["is-shadow"]: true,
      margin: "10px 0"
    }),
    p: common_vendor.f($options.formatImages($data.data.goods_introduce_imgs), (img, index, i0) => {
      return {
        a: img.url || img,
        b: common_vendor.o(($event) => $options.previewImage($options.formatImages($data.data.goods_introduce_imgs), index), index),
        c: index
      };
    }),
    q: !$options.formatImages($data.data.goods_introduce_imgs).length
  }, !$options.formatImages($data.data.goods_introduce_imgs).length ? {} : {}, {
    r: common_vendor.p({
      title: "介绍图",
      ["is-shadow"]: true,
      margin: "10px 0"
    }),
    s: common_vendor.t($data.data.is_hot ? "是" : "否"),
    t: common_vendor.n($data.data.is_hot ? "active" : "inactive"),
    v: common_vendor.t($data.data.is_new ? "是" : "否"),
    w: common_vendor.n($data.data.is_new ? "active" : "inactive"),
    x: common_vendor.p({
      title: "状态",
      ["is-shadow"]: true,
      margin: "10px 0"
    })
  }) : {}, {
    c: $data.error,
    e: $data.data
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-adbe0a1d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/goods/detail.js.map
