"use strict";
const common_vendor = require("./common/vendor.js");
const _sfc_main = {
  data() {
    return {
      collectionList: "opendb-mall-goods",
      // 搜索
      searchInput: "",
      searchText: "",
      // 状态筛选
      statusOptions: ["全部标签", "热销", "新品", "下架", "预售"],
      statusIndex: 0,
      statusType: "all",
      // 类别筛选
      categoryOptions: [{ value: "", text: "全部分类" }],
      categoryIndex: 0,
      categoryValue: "",
      // 分类映射
      categoryMap: {},
      // 下拉刷新状态
      refreshing: false
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
        case "pre":
          condition.is_pre = true;
          break;
      }
      if (this.categoryValue) {
        condition.category = this.categoryValue;
      }
      return condition;
    }
  },
  created() {
    this.loadAllCategories().then(() => {
      this.$nextTick(() => {
        this.$refs.udb && this.$refs.udb.loadData();
      });
    });
  },
  methods: {
    // 预加载全部分类（构造类别菜单和分类映射）
    async loadAllCategories() {
      try {
        const db = common_vendor.tr.databaseForJQL();
        const res = await db.collection("opendb-mall-categories").field("_id, name").get();
        if (res && Array.isArray(res.data)) {
          res.data.forEach((cat) => {
            this.categoryMap[cat._id] = cat.name;
          });
          this.categoryOptions = [{ value: "", text: "全部分类" }];
          res.data.forEach((cat) => {
            this.categoryOptions.push({ value: cat._id, text: cat.name });
          });
          common_vendor.index.__f__("log", "at pages/pages_admin/opendb-mall-goods/list.vue:168", "分类菜单加载完成", this.categoryOptions);
        } else {
          common_vendor.index.__f__("warn", "at pages/pages_admin/opendb-mall-goods/list.vue:170", "分类加载返回格式异常", res);
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/pages_admin/opendb-mall-goods/list.vue:173", "加载分类失败", err);
      }
    },
    // 根据分类ID获取名称
    getCategoryName(catId) {
      if (!catId)
        return "-";
      return this.categoryMap[catId] || "-";
    },
    // 状态筛选变更
    onStatusFilterChange(e) {
      this.statusIndex = e.detail.value;
      const types = ["all", "hot", "new", "off", "pre"];
      this.statusType = types[this.statusIndex];
      this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },
    // 类别筛选变更
    onCategoryFilterChange(e) {
      this.categoryIndex = e.detail.value;
      this.categoryValue = this.categoryOptions[this.categoryIndex].value;
      this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },
    // 搜索
    onSearch() {
      this.searchText = this.searchInput;
      this.$refs.udb && this.$refs.udb.loadData({ clear: true });
    },
    // 下拉刷新
    onRefresh() {
      this.refreshing = true;
      this.$refs.udb.loadData({ clear: true }, () => {
        this.refreshing = false;
      });
    },
    // 上拉加载更多
    loadMore() {
      this.$refs.udb.loadMore();
    },
    // 数据加载完成后的处理（可选）
    onDataLoad(data) {
      common_vendor.index.__f__("log", "at pages/pages_admin/opendb-mall-goods/list.vue:221", "商品数据加载", data);
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
    handleItemClick(id) {
      common_vendor.index.navigateTo({
        url: "../opendb-mall-goods/detail?id=" + id,
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    fabClick() {
      common_vendor.index.navigateTo({
        url: "../opendb-mall-goods/add",
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_list_item2 = common_vendor.resolveComponent("uni-list-item");
  const _easycom_uni_list2 = common_vendor.resolveComponent("uni-list");
  const _easycom_uni_load_more2 = common_vendor.resolveComponent("uni-load-more");
  const _easycom_unicloud_db2 = common_vendor.resolveComponent("unicloud-db");
  const _easycom_uni_fab2 = common_vendor.resolveComponent("uni-fab");
  (_easycom_uni_list_item2 + _easycom_uni_list2 + _easycom_uni_load_more2 + _easycom_unicloud_db2 + _easycom_uni_fab2)();
}
const _easycom_uni_list_item = () => "./uni_modules/uni-list/components/uni-list-item/uni-list-item.js";
const _easycom_uni_list = () => "./uni_modules/uni-list/components/uni-list/uni-list.js";
const _easycom_uni_load_more = () => "./uni_modules/uni-load-more/components/uni-load-more/uni-load-more.js";
const _easycom_unicloud_db = () => "./node-modules/@dcloudio/uni-components/lib/unicloud-db/unicloud-db.js";
const _easycom_uni_fab = () => "./uni_modules/uni-fab/components/uni-fab/uni-fab.js";
if (!Math) {
  (_easycom_uni_list_item + _easycom_uni_list + _easycom_uni_load_more + _easycom_unicloud_db + _easycom_uni_fab)();
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
            m: item.is_pre
          }, item.is_pre ? {} : {}, {
            n: index,
            o: common_vendor.o(($event) => $options.handleItemClick(item._id), index),
            p: "c25c821b-2-" + i0 + "-" + i1 + "," + ("c25c821b-1-" + i0)
          });
        }),
        e: common_vendor.p({
          showArrow: true,
          clickable: true
        }),
        f: "c25c821b-1-" + i0 + ",c25c821b-0"
      } : {}, {
        c: data,
        g: "c25c821b-3-" + i0 + ",c25c821b-0",
        h: common_vendor.p({
          status: loading ? "loading" : hasMore ? "more" : "noMore"
        }),
        i: i0,
        j: s0
      });
    }, {
      name: "d",
      path: "m",
      vueId: "c25c821b-0"
    }),
    n: common_vendor.sr("udb", "c25c821b-0"),
    o: common_vendor.o($options.onDataLoad),
    p: common_vendor.p({
      collection: $data.collectionList,
      ["page-size"]: 20,
      where: $options.whereCondition,
      field: "name,remain_count,goods_price,standard,category,goods_swiper_imgs,is_hot,is_new,is_on_sale,is_pre,production_date,shelf_life_months",
      manual: true
    }),
    q: common_vendor.sr("fab", "c25c821b-4"),
    r: common_vendor.o($options.fabClick),
    s: common_vendor.p({
      horizontal: "right",
      vertical: "bottom",
      ["pop-menu"]: false
    }),
    t: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args)),
    v: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    w: $data.refreshing
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c25c821b"]]);
exports.MiniProgramPage = MiniProgramPage;
//# sourceMappingURL=../.sourcemap/mp-weixin/list2.js.map
