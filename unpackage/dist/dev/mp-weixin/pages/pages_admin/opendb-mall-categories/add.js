"use strict";
const common_vendor = require("../../../common/vendor.js");
const js_sdk_validator_opendbMallCategories = require("../../../js_sdk/validator/opendb-mall-categories.js");
const db = common_vendor.tr.database();
const dbCollectionName = "opendb-mall-categories";
function getValidator(fields) {
  let result = {};
  for (let key in js_sdk_validator_opendbMallCategories.validator) {
    if (fields.indexOf(key) > -1) {
      result[key] = js_sdk_validator_opendbMallCategories.validator[key];
    }
  }
  return result;
}
const _sfc_main = {
  data() {
    let formData = {
      "name": "",
      "sort": null,
      "description": ""
    };
    return {
      formData,
      formOptions: {},
      // 合并原有校验规则，并增加sort的正整数限制
      rules: {
        ...getValidator(Object.keys(formData)),
        sort: {
          rules: [
            { required: false, errorMessage: "请输入排序" },
            { pattern: /^\d+$/, errorMessage: "排序必须为非负整数" }
          ]
        }
      }
    };
  },
  onReady() {
    this.$refs.form.setRules(this.rules);
  },
  methods: {
    submit() {
      common_vendor.index.showLoading({ mask: true });
      this.$refs.form.validate().then((res) => {
        return this.submitForm(res);
      }).catch(() => {
      }).finally(() => {
        common_vendor.index.hideLoading();
      });
    },
    submitForm(value) {
      if (value.sort !== void 0 && value.sort !== null && value.sort !== "") {
        value.sort = parseInt(value.sort, 10);
      } else {
        delete value.sort;
      }
      return db.collection(dbCollectionName).add(value).then((res) => {
        common_vendor.index.showToast({ icon: "none", title: "新增成功" });
        this.getOpenerEventChannel().emit("refreshData");
        setTimeout(() => common_vendor.index.navigateBack(), 500);
      }).catch((err) => {
        common_vendor.index.showModal({ content: err.message || "请求服务失败", showCancel: false });
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_easyinput2 = common_vendor.resolveComponent("uni-easyinput");
  const _easycom_uni_forms_item2 = common_vendor.resolveComponent("uni-forms-item");
  const _easycom_uni_forms2 = common_vendor.resolveComponent("uni-forms");
  (_easycom_uni_easyinput2 + _easycom_uni_forms_item2 + _easycom_uni_forms2)();
}
const _easycom_uni_easyinput = () => "../../../uni_modules/uni-easyinput/components/uni-easyinput/uni-easyinput.js";
const _easycom_uni_forms_item = () => "../../../uni_modules/uni-forms/components/uni-forms-item/uni-forms-item.js";
const _easycom_uni_forms = () => "../../../uni_modules/uni-forms/components/uni-forms/uni-forms.js";
if (!Math) {
  (_easycom_uni_easyinput + _easycom_uni_forms_item + _easycom_uni_forms)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => $data.formData.name = $event),
    b: common_vendor.p({
      placeholder: "类别名称",
      trim: "both",
      modelValue: $data.formData.name
    }),
    c: common_vendor.p({
      name: "name",
      label: "类别名称",
      required: true
    }),
    d: common_vendor.o(($event) => $data.formData.sort = $event),
    e: common_vendor.p({
      placeholder: "类别排序，越大越靠后（非负整数）",
      type: "number",
      modelValue: $data.formData.sort
    }),
    f: common_vendor.p({
      name: "sort",
      label: "排序"
    }),
    g: common_vendor.o(($event) => $data.formData.description = $event),
    h: common_vendor.p({
      placeholder: "类别描述",
      trim: "both",
      modelValue: $data.formData.description
    }),
    i: common_vendor.p({
      name: "description",
      label: "类别描述"
    }),
    j: common_vendor.o((...args) => $options.submit && $options.submit(...args)),
    k: common_vendor.sr("form", "36a1ef2b-0"),
    l: common_vendor.p({
      model: $data.formData,
      ["validate-trigger"]: "submit",
      ["err-show-type"]: "toast"
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/pages_admin/opendb-mall-categories/add.js.map
