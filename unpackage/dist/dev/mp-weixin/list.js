"use strict";
const common_vendor = require("./common/vendor.js");
const _sfc_main = {
  data() {
    return {
      collectionList: "opendb-mall-categories",
      refreshing: false
      // 下拉刷新状态
    };
  },
  created() {
    this.$nextTick(() => {
      if (this.$refs.udb) {
        this.$refs.udb.loadData();
      }
    });
  },
  methods: {
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
    // 点击行进入详情页（使用绝对路径）
    handleItemClick(id) {
      common_vendor.index.navigateTo({
        url: "../opendb-mall-categories/detail?id=" + id,
        events: {
          refreshData: () => {
            this.$refs.udb && this.$refs.udb.loadData({ clear: true });
          }
        }
      });
    },
    // 点击新增按钮（使用绝对路径）
    fabClick() {
      common_vendor.index.navigateTo({
        url: "../opendb-mall-categories/add",
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
    a: common_vendor.w(({
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
          return {
            a: common_vendor.t(item.name),
            b: common_vendor.t(item.description || "暂无描述"),
            c: index,
            d: common_vendor.o(($event) => $options.handleItemClick(item._id), index),
            e: "d93cffdd-2-" + i0 + "-" + i1 + "," + ("d93cffdd-1-" + i0)
          };
        }),
        e: common_vendor.p({
          showArrow: true,
          clickable: true
        }),
        f: "d93cffdd-1-" + i0 + ",d93cffdd-0"
      } : {}, {
        c: data,
        g: "d93cffdd-3-" + i0 + ",d93cffdd-0",
        h: common_vendor.p({
          status: loading ? "loading" : hasMore ? "more" : "noMore"
        }),
        i: i0,
        j: s0
      });
    }, {
      name: "d",
      path: "a",
      vueId: "d93cffdd-0"
    }),
    b: common_vendor.sr("udb", "d93cffdd-0"),
    c: common_vendor.p({
      collection: $data.collectionList,
      field: "name,sort,description",
      orderby: "sort asc",
      manual: true
    }),
    d: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args)),
    e: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    f: $data.refreshing,
    g: common_vendor.sr("fab", "d93cffdd-4"),
    h: common_vendor.o($options.fabClick),
    i: common_vendor.p({
      horizontal: "right",
      vertical: "bottom",
      ["pop-menu"]: false
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d93cffdd"]]);
exports.MiniProgramPage = MiniProgramPage;
//# sourceMappingURL=../.sourcemap/mp-weixin/list.js.map
