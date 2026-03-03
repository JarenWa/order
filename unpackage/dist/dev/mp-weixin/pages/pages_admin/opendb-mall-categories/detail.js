"use strict";
const common_vendor = require("../../../common/vendor.js");
const js_sdk_validator_opendbMallCategories = require("../../../js_sdk/validator/opendb-mall-categories.js");
common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      queryWhere: "",
      collectionList: "opendb-mall-categories",
      loadMore: {
        contentdown: "",
        contentrefresh: "",
        contentnomore: ""
      },
      options: {
        // 将scheme enum 属性静态数据中的value转成text
        ...js_sdk_validator_opendbMallCategories.enumConverter
      },
      eventChannel: null
      // 保存事件通道
    };
  },
  onLoad(e) {
    this._id = e.id;
    this.eventChannel = this.getOpenerEventChannel();
  },
  onReady() {
    if (this._id) {
      this.queryWhere = '_id=="' + this._id + '"';
    }
  },
  methods: {
    handleUpdate() {
      common_vendor.index.navigateTo({
        url: "../opendb-mall-categories/edit?id=" + this._id,
        events: {
          // 监听修改页面成功修改数据后, 刷新当前页面数据
          refreshData: () => {
            this.$refs.udb.loadData({ clear: true });
            if (this.eventChannel) {
              this.eventChannel.emit("refreshData");
            }
          }
        }
      });
    },
    // 删除确认
    confirmDelete() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要删除该类别吗？",
        success: (res) => {
          if (res.confirm) {
            this.handleDelete();
          }
        }
      });
    },
    handleDelete() {
      this.$refs.udb.remove(this._id, {
        success: (res) => {
          common_vendor.index.showToast({
            icon: "none",
            title: "删除成功"
          });
          if (this.eventChannel) {
            this.eventChannel.emit("refreshData");
          }
          setTimeout(() => common_vendor.index.navigateBack(), 500);
        },
        fail: (err) => {
          common_vendor.index.showModal({
            content: err.message || "删除失败",
            showCancel: false
          });
        }
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_load_more2 = common_vendor.resolveComponent("uni-load-more");
  const _easycom_unicloud_db2 = common_vendor.resolveComponent("unicloud-db");
  (_easycom_uni_load_more2 + _easycom_unicloud_db2)();
}
const _easycom_uni_load_more = () => "../../../uni_modules/uni-load-more/components/uni-load-more/uni-load-more.js";
const _easycom_unicloud_db = () => "../../../node-modules/@dcloudio/uni-components/lib/unicloud-db/unicloud-db.js";
if (!Math) {
  (_easycom_uni_load_more + _easycom_unicloud_db)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.w(({
      data,
      loading,
      error,
      options
    }, s0, i0) => {
      return common_vendor.e({
        a: error
      }, error ? {
        b: common_vendor.t(error.message)
      } : loading ? {
        d: "08c390b7-1-" + i0 + ",08c390b7-0",
        e: common_vendor.p({
          contentText: $data.loadMore,
          status: "loading"
        })
      } : data ? {
        g: common_vendor.t(data.name),
        h: common_vendor.t(data.sort),
        i: common_vendor.t(data.description)
      } : {}, {
        c: loading,
        f: data,
        j: i0,
        k: s0
      });
    }, {
      name: "d",
      path: "a",
      vueId: "08c390b7-0"
    }),
    b: common_vendor.sr("udb", "08c390b7-0"),
    c: common_vendor.p({
      options: $data.options,
      collection: $data.collectionList,
      field: "name,sort,description",
      where: $data.queryWhere,
      getone: true,
      manual: true
    }),
    d: common_vendor.o((...args) => $options.handleUpdate && $options.handleUpdate(...args)),
    e: common_vendor.o((...args) => $options.confirmDelete && $options.confirmDelete(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/pages_admin/opendb-mall-categories/detail.js.map
