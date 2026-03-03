"use strict";
const common_vendor = require("../../../common/vendor.js");
const js_sdk_validator_opendbMallGoods = require("../../../js_sdk/validator/opendb-mall-goods.js");
const db = common_vendor.tr.database();
const dbCollectionName = "opendb-mall-goods";
function getValidator(fields) {
  let result = {};
  for (let key in js_sdk_validator_opendbMallGoods.validator) {
    if (fields.indexOf(key) > -1) {
      result[key] = js_sdk_validator_opendbMallGoods.validator[key];
    }
  }
  return result;
}
const _sfc_main = {
  data() {
    const formData = {
      name: "",
      remain_count: 999,
      goods_price: null,
      // 存储分
      priceYuan: "",
      // 输入元
      goods_desc: "",
      standard: "",
      category: "",
      production_date: "",
      shelf_life_months: null,
      goods_swiper_imgs: [],
      // 存储完整文件对象数组
      goods_introduce_imgs: [],
      goods_thumb: "",
      is_hot: null,
      is_new: null,
      is_on_sale: true,
      is_pre: null,
      tag: [],
      comment_count: 0,
      total_sell_count: 0,
      last_modify_date: null,
      operater: ""
    };
    return {
      formData,
      formOptions: {},
      categoryOptions: [],
      rules: {
        ...getValidator(Object.keys(formData)),
        priceYuan: {
          rules: [
            { required: true, errorMessage: "请输入价格" },
            { pattern: /^\d+(\.\d{0,2})?$/, errorMessage: "价格最多两位小数" }
          ]
        },
        production_date: {
          rules: [{ pattern: /^\d{4}-\d{2}$/, errorMessage: "生产日期格式为YYYY-MM" }]
        },
        shelf_life_months: {
          rules: [{ pattern: /^[1-9]\d*$/, errorMessage: "请输入正整数" }]
        },
        goods_swiper_imgs: { rules: [] },
        goods_introduce_imgs: { rules: [] }
      }
    };
  },
  onLoad() {
    this.loadCategories();
  },
  onReady() {
    this.$refs.form.setRules(this.rules);
  },
  methods: {
    // 价格转换：元 → 分
    formatPrice() {
      if (this.formData.priceYuan) {
        const yuan = parseFloat(this.formData.priceYuan);
        if (!isNaN(yuan)) {
          this.formData.goods_price = Math.round(yuan * 100);
          this.formData.priceYuan = yuan.toFixed(2);
        } else {
          this.formData.goods_price = null;
        }
      } else {
        this.formData.goods_price = null;
      }
    },
    // 生产日期选择
    onProductionDateChange(e) {
      this.formData.production_date = e.detail.value;
    },
    // 保质期输入处理
    formatShelfLife() {
      if (this.formData.shelf_life_months) {
        const val = parseInt(this.formData.shelf_life_months, 10);
        if (!isNaN(val) && val > 0) {
          this.formData.shelf_life_months = val;
        } else {
          this.formData.shelf_life_months = null;
        }
      }
    },
    // ---------- 轮播图处理 ----------
    handleSwiperSuccess(e) {
      const validFiles = e.tempFiles.filter((file) => file.url || file.fileID);
      if (validFiles.length === 0) {
        common_vendor.index.showToast({ title: "轮播图上传失败，请重试", icon: "none" });
        return;
      }
      this.formData.goods_swiper_imgs = [
        ...this.formData.goods_swiper_imgs || [],
        ...validFiles
      ];
    },
    handleSwiperDelete(e) {
      const deleted = e.tempFile;
      this.formData.goods_swiper_imgs = this.formData.goods_swiper_imgs.filter(
        (item) => item.fileID !== deleted.fileID && item.url !== (deleted.url || deleted.path)
      );
    },
    // ---------- 介绍图处理 ----------
    handleIntroduceSuccess(e) {
      const validFiles = e.tempFiles.filter((file) => file.url || file.fileID);
      if (validFiles.length === 0) {
        common_vendor.index.showToast({ title: "介绍图上传失败，请重试", icon: "none" });
        return;
      }
      this.formData.goods_introduce_imgs = [
        ...this.formData.goods_introduce_imgs || [],
        ...validFiles
      ];
    },
    handleIntroduceDelete(e) {
      const deleted = e.tempFile;
      this.formData.goods_introduce_imgs = this.formData.goods_introduce_imgs.filter(
        (item) => item.fileID !== deleted.fileID && item.url !== (deleted.url || deleted.path)
      );
    },
    // 上传失败通用处理
    handleUploadFail(e) {
      common_vendor.index.__f__("error", "at pages/pages_admin/opendb-mall-goods/add.vue:250", "上传失败", e);
      common_vendor.index.showToast({ title: "图片上传失败", icon: "none" });
    },
    // 加载分类下拉
    async loadCategories() {
      const db2 = common_vendor.tr.databaseForJQL();
      const res = await db2.collection("opendb-mall-categories").field("_id, name").get();
      this.categoryOptions = res.data.map((item) => ({
        value: item._id,
        text: item.name
      }));
    },
    // ---------- 提交表单 ----------
    submit() {
      this.formatPrice();
      if (this.formData.remain_count != null) {
        const remain = parseInt(this.formData.remain_count, 10);
        if (isNaN(remain)) {
          common_vendor.index.showModal({ content: "库存数量必须为整数", showCancel: false });
          return;
        }
        this.formData.remain_count = remain;
      }
      const checkImages = (imgs) => {
        if (!imgs || imgs.length === 0)
          return true;
        return imgs.every((img) => img.url || img.fileID);
      };
      if (!checkImages(this.formData.goods_swiper_imgs)) {
        common_vendor.index.showModal({ content: "部分轮播图未成功上传，请重新上传", showCancel: false });
        return;
      }
      if (!checkImages(this.formData.goods_introduce_imgs)) {
        common_vendor.index.showModal({ content: "部分介绍图未成功上传，请重新上传", showCancel: false });
        return;
      }
      common_vendor.index.showLoading({ mask: true });
      this.$refs.form.validate().then(() => {
        const { priceYuan, ...dataToSubmit } = this.formData;
        dataToSubmit.is_hot = dataToSubmit.is_hot === true;
        dataToSubmit.is_new = dataToSubmit.is_new === true;
        dataToSubmit.is_on_sale = dataToSubmit.is_on_sale !== false;
        return db.collection(dbCollectionName).add(dataToSubmit);
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "新增成功", icon: "success" });
        this.getOpenerEventChannel().emit("refreshData");
        setTimeout(() => common_vendor.index.navigateBack(), 500);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/pages_admin/opendb-mall-goods/add.vue:316", "提交失败", err);
        common_vendor.index.showModal({ content: err.message || "提交失败", showCancel: false });
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_easyinput2 = common_vendor.resolveComponent("uni-easyinput");
  const _easycom_uni_forms_item2 = common_vendor.resolveComponent("uni-forms-item");
  const _easycom_uni_data_select2 = common_vendor.resolveComponent("uni-data-select");
  const _easycom_uni_file_picker2 = common_vendor.resolveComponent("uni-file-picker");
  const _easycom_uni_data_checkbox2 = common_vendor.resolveComponent("uni-data-checkbox");
  const _easycom_uni_forms2 = common_vendor.resolveComponent("uni-forms");
  (_easycom_uni_easyinput2 + _easycom_uni_forms_item2 + _easycom_uni_data_select2 + _easycom_uni_file_picker2 + _easycom_uni_data_checkbox2 + _easycom_uni_forms2)();
}
const _easycom_uni_easyinput = () => "../../../uni_modules/uni-easyinput/components/uni-easyinput/uni-easyinput.js";
const _easycom_uni_forms_item = () => "../../../uni_modules/uni-forms/components/uni-forms-item/uni-forms-item.js";
const _easycom_uni_data_select = () => "../../../uni_modules/uni-data-select/components/uni-data-select/uni-data-select.js";
const _easycom_uni_file_picker = () => "../../../uni_modules/uni-file-picker/components/uni-file-picker/uni-file-picker.js";
const _easycom_uni_data_checkbox = () => "../../../uni_modules/uni-data-checkbox/components/uni-data-checkbox/uni-data-checkbox.js";
const _easycom_uni_forms = () => "../../../uni_modules/uni-forms/components/uni-forms/uni-forms.js";
if (!Math) {
  (_easycom_uni_easyinput + _easycom_uni_forms_item + _easycom_uni_data_select + _easycom_uni_file_picker + _easycom_uni_data_checkbox + _easycom_uni_forms)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => $data.formData.name = $event),
    b: common_vendor.p({
      placeholder: "商品名称",
      trim: "both",
      modelValue: $data.formData.name
    }),
    c: common_vendor.p({
      name: "name",
      label: "名称",
      required: true
    }),
    d: common_vendor.o(($event) => $data.formData.remain_count = $event),
    e: common_vendor.p({
      placeholder: "库存数量",
      type: "number",
      modelValue: $data.formData.remain_count
    }),
    f: common_vendor.p({
      name: "remain_count",
      label: "库存数量",
      required: true
    }),
    g: common_vendor.o($options.formatPrice),
    h: common_vendor.o(($event) => $data.formData.priceYuan = $event),
    i: common_vendor.p({
      placeholder: "请输入价格，如29.90",
      type: "digit",
      modelValue: $data.formData.priceYuan
    }),
    j: common_vendor.p({
      name: "priceYuan",
      label: "价格(元)",
      required: true
    }),
    k: common_vendor.o(($event) => $data.formData.standard = $event),
    l: common_vendor.p({
      placeholder: "商品规格",
      trim: "both",
      modelValue: $data.formData.standard
    }),
    m: common_vendor.p({
      name: "standard",
      label: "商品规格",
      required: true
    }),
    n: common_vendor.o(($event) => $data.formData.category = $event),
    o: common_vendor.p({
      localdata: $data.categoryOptions,
      placeholder: "请选择商品类别",
      modelValue: $data.formData.category
    }),
    p: common_vendor.p({
      label: "商品类别",
      name: "category"
    }),
    q: common_vendor.t($data.formData.production_date || "请选择年月"),
    r: $data.formData.production_date,
    s: common_vendor.o((...args) => $options.onProductionDateChange && $options.onProductionDateChange(...args)),
    t: common_vendor.p({
      name: "production_date",
      label: "生产日期"
    }),
    v: common_vendor.o($options.formatShelfLife),
    w: common_vendor.o(($event) => $data.formData.shelf_life_months = $event),
    x: common_vendor.p({
      placeholder: "请输入月份数",
      type: "number",
      modelValue: $data.formData.shelf_life_months
    }),
    y: common_vendor.p({
      name: "shelf_life_months",
      label: "保质期(月)"
    }),
    z: common_vendor.o(($event) => $data.formData.goods_desc = $event),
    A: common_vendor.p({
      placeholder: "商品简短描述",
      trim: "both",
      modelValue: $data.formData.goods_desc
    }),
    B: common_vendor.p({
      name: "goods_desc",
      label: "商品简介"
    }),
    C: common_vendor.o($options.handleSwiperSuccess),
    D: common_vendor.o($options.handleUploadFail),
    E: common_vendor.o($options.handleSwiperDelete),
    F: common_vendor.p({
      ["file-mediatype"]: "image",
      mode: "grid",
      limit: 5,
      title: "最多上传5张"
    }),
    G: common_vendor.p({
      name: "goods_swiper_imgs",
      label: "详情轮播图"
    }),
    H: common_vendor.o($options.handleIntroduceSuccess),
    I: common_vendor.o($options.handleUploadFail),
    J: common_vendor.o($options.handleIntroduceDelete),
    K: common_vendor.p({
      ["file-mediatype"]: "image",
      mode: "grid",
      limit: 5,
      title: "最多上传5张"
    }),
    L: common_vendor.p({
      name: "goods_introduce_imgs",
      label: "详情介绍图"
    }),
    M: common_vendor.o(($event) => _ctx.binddata("is_hot", $event.detail.value)),
    N: $data.formData.is_hot,
    O: common_vendor.p({
      name: "is_hot",
      label: "是否热销"
    }),
    P: common_vendor.o(($event) => _ctx.binddata("is_new", $event.detail.value)),
    Q: $data.formData.is_new,
    R: common_vendor.p({
      name: "is_new",
      label: "是否新品"
    }),
    S: common_vendor.o(($event) => _ctx.binddata("is_on_sale", $event.detail.value)),
    T: $data.formData.is_on_sale,
    U: common_vendor.p({
      name: "is_on_sale",
      label: "是否上架"
    }),
    V: common_vendor.o(($event) => _ctx.binddata("is_pre", $event.detail.value)),
    W: $data.formData.is_pre,
    X: common_vendor.p({
      name: "is_pre",
      label: "是否预售"
    }),
    Y: common_vendor.o(($event) => $data.formData.tag = $event),
    Z: common_vendor.p({
      multiple: true,
      modelValue: $data.formData.tag
    }),
    aa: common_vendor.p({
      name: "tag",
      label: "商品标签"
    }),
    ab: common_vendor.o(($event) => $data.formData.operater = $event),
    ac: common_vendor.p({
      placeholder: "操作员",
      modelValue: $data.formData.operater
    }),
    ad: common_vendor.p({
      name: "operater",
      label: "操作员"
    }),
    ae: common_vendor.o((...args) => $options.submit && $options.submit(...args)),
    af: common_vendor.sr("form", "891d9f0a-0"),
    ag: common_vendor.p({
      model: $data.formData,
      ["validate-trigger"]: "submit",
      ["err-show-type"]: "toast"
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/pages_admin/opendb-mall-goods/add.js.map
