"use strict";
const common_vendor = require("../../../common/vendor.js");
const js_sdk_validator_uniPayOrders = require("../../../js_sdk/validator/uni-pay-orders.js");
const db = common_vendor.tr.database();
const dbCollectionName = "uni-pay-orders";
function getValidator(fields) {
  let result = {};
  for (let key in js_sdk_validator_uniPayOrders.validator) {
    if (fields.indexOf(key) > -1) {
      result[key] = js_sdk_validator_uniPayOrders.validator[key];
    }
  }
  return result;
}
const _sfc_main = {
  data() {
    let formData = {
      "provider": "",
      "provider_pay_type": "",
      "uni_platform": "",
      "status": 0,
      "type": "",
      "order_no": "",
      "out_trade_no": "",
      "transaction_id": "",
      "user_id": "",
      "nickname": "",
      "device_id": "",
      "client_ip": "",
      "openid": "",
      "description": "",
      "err_msg": "",
      "total_fee": null,
      "refund_fee": null,
      "refund_count": null,
      "refund_list": [],
      "provider_appid": "",
      "appid": "",
      "user_order_success": null,
      "pay_date": null,
      "notify_date": null,
      "cancel_date": null,
      "refund_date": null
    };
    return {
      formData,
      formOptions: {
        "provider_localdata": [
          {
            "text": "微信支付",
            "value": "wxpay"
          },
          {
            "text": "支付宝",
            "value": "alipay"
          },
          {
            "text": "苹果应用内支付",
            "value": "appleiap"
          }
        ],
        "status_localdata": [
          {
            "text": "已关闭",
            "value": -1
          },
          {
            "text": "未支付",
            "value": 0
          },
          {
            "text": "已支付",
            "value": 1
          },
          {
            "text": "已部分退款",
            "value": 2
          },
          {
            "text": "已全额退款",
            "value": 3
          }
        ]
      },
      rules: {
        ...getValidator(Object.keys(formData))
      }
    };
  },
  onReady() {
    this.$refs.form.setRules(this.rules);
  },
  methods: {
    /**
     * 验证表单并提交
     */
    submit() {
      common_vendor.index.showLoading({
        mask: true
      });
      this.$refs.form.validate().then((res) => {
        return this.submitForm(res);
      }).catch(() => {
      }).finally(() => {
        common_vendor.index.hideLoading();
      });
    },
    /**
     * 提交表单
     */
    submitForm(value) {
      return db.collection(dbCollectionName).add(value).then((res) => {
        common_vendor.index.showToast({
          icon: "none",
          title: "新增成功"
        });
        this.getOpenerEventChannel().emit("refreshData");
        setTimeout(() => common_vendor.index.navigateBack(), 500);
      }).catch((err) => {
        common_vendor.index.showModal({
          content: err.message || "请求服务失败",
          showCancel: false
        });
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_data_checkbox2 = common_vendor.resolveComponent("uni-data-checkbox");
  const _easycom_uni_forms_item2 = common_vendor.resolveComponent("uni-forms-item");
  const _easycom_uni_easyinput2 = common_vendor.resolveComponent("uni-easyinput");
  const _easycom_uni_datetime_picker2 = common_vendor.resolveComponent("uni-datetime-picker");
  const _easycom_uni_forms2 = common_vendor.resolveComponent("uni-forms");
  (_easycom_uni_data_checkbox2 + _easycom_uni_forms_item2 + _easycom_uni_easyinput2 + _easycom_uni_datetime_picker2 + _easycom_uni_forms2)();
}
const _easycom_uni_data_checkbox = () => "../../../uni_modules/uni-data-checkbox/components/uni-data-checkbox/uni-data-checkbox.js";
const _easycom_uni_forms_item = () => "../../../uni_modules/uni-forms/components/uni-forms-item/uni-forms-item.js";
const _easycom_uni_easyinput = () => "../../../uni_modules/uni-easyinput/components/uni-easyinput/uni-easyinput.js";
const _easycom_uni_datetime_picker = () => "../../../uni_modules/uni-datetime-picker/components/uni-datetime-picker/uni-datetime-picker.js";
const _easycom_uni_forms = () => "../../../uni_modules/uni-forms/components/uni-forms/uni-forms.js";
if (!Math) {
  (_easycom_uni_data_checkbox + _easycom_uni_forms_item + _easycom_uni_easyinput + _easycom_uni_datetime_picker + _easycom_uni_forms)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => $data.formData.provider = $event),
    b: common_vendor.p({
      localdata: $data.formOptions.provider_localdata,
      modelValue: $data.formData.provider
    }),
    c: common_vendor.p({
      name: "provider",
      label: "支付供应商"
    }),
    d: common_vendor.o(($event) => $data.formData.provider_pay_type = $event),
    e: common_vendor.p({
      placeholder: "支付供应商的支付类型（插件内部标记支付类型的标识，不需要用户传）",
      trim: "both",
      modelValue: $data.formData.provider_pay_type
    }),
    f: common_vendor.p({
      name: "provider_pay_type",
      label: "支付方式"
    }),
    g: common_vendor.o(($event) => $data.formData.uni_platform = $event),
    h: common_vendor.p({
      placeholder: "uni客户端平台,如：web、mp-weixin、mp-alipay、app等",
      trim: "both",
      modelValue: $data.formData.uni_platform
    }),
    i: common_vendor.p({
      name: "uni_platform",
      label: "应用平台"
    }),
    j: common_vendor.o(($event) => $data.formData.status = $event),
    k: common_vendor.p({
      localdata: $data.formOptions.status_localdata,
      modelValue: $data.formData.status
    }),
    l: common_vendor.p({
      name: "status",
      label: "订单状态"
    }),
    m: common_vendor.o(($event) => $data.formData.type = $event),
    n: common_vendor.p({
      placeholder: "订单类型 goods：订单付款 recharge：余额充值付款 vip：vip充值付款 等等，可自定义",
      trim: "both",
      modelValue: $data.formData.type
    }),
    o: common_vendor.p({
      name: "type",
      label: "订单类型"
    }),
    p: common_vendor.o(($event) => $data.formData.order_no = $event),
    q: common_vendor.p({
      placeholder: "业务系统订单号，控制在20-28位（不可以是24位,24位在阿里云空间可能会有问题，可重复，代表1个业务订单会有多次付款的情况）",
      trim: "both",
      modelValue: $data.formData.order_no
    }),
    r: common_vendor.p({
      name: "order_no",
      label: "业务系统订单号"
    }),
    s: common_vendor.o(($event) => $data.formData.out_trade_no = $event),
    t: common_vendor.p({
      placeholder: "支付插件订单号（需控制唯一，不传则由插件自动生成）",
      trim: "both",
      modelValue: $data.formData.out_trade_no
    }),
    v: common_vendor.p({
      name: "out_trade_no",
      label: "支付插件订单号"
    }),
    w: common_vendor.o(($event) => $data.formData.transaction_id = $event),
    x: common_vendor.p({
      placeholder: "交易单号（支付平台订单号，由支付平台控制唯一）",
      trim: "both",
      modelValue: $data.formData.transaction_id
    }),
    y: common_vendor.p({
      name: "transaction_id",
      label: "交易单号"
    }),
    z: common_vendor.o(($event) => $data.formData.user_id = $event),
    A: common_vendor.p({
      placeholder: "用户id，参考uni-id-users表",
      modelValue: $data.formData.user_id
    }),
    B: common_vendor.p({
      name: "user_id",
      label: "用户ID"
    }),
    C: common_vendor.o(($event) => $data.formData.nickname = $event),
    D: common_vendor.p({
      placeholder: "用户昵称冗余",
      trim: "both",
      modelValue: $data.formData.nickname
    }),
    E: common_vendor.p({
      name: "nickname",
      label: "用户昵称"
    }),
    F: common_vendor.o(($event) => $data.formData.device_id = $event),
    G: common_vendor.p({
      placeholder: "客户端设备ID",
      modelValue: $data.formData.device_id
    }),
    H: common_vendor.p({
      name: "device_id",
      label: ""
    }),
    I: common_vendor.o(($event) => $data.formData.client_ip = $event),
    J: common_vendor.p({
      placeholder: "创建支付的客户端ip",
      trim: "both",
      modelValue: $data.formData.client_ip
    }),
    K: common_vendor.p({
      name: "client_ip",
      label: "客户端IP"
    }),
    L: common_vendor.o(($event) => $data.formData.openid = $event),
    M: common_vendor.p({
      placeholder: "发起支付的用户openid",
      trim: "both",
      modelValue: $data.formData.openid
    }),
    N: common_vendor.p({
      name: "openid",
      label: "openid"
    }),
    O: common_vendor.o(($event) => $data.formData.description = $event),
    P: common_vendor.p({
      placeholder: "支付描述，如：uniCloud个人版包月套餐",
      trim: "both",
      modelValue: $data.formData.description
    }),
    Q: common_vendor.p({
      name: "description",
      label: "支付描述"
    }),
    R: common_vendor.o(($event) => $data.formData.err_msg = $event),
    S: common_vendor.p({
      placeholder: "支付失败原因",
      trim: "both",
      modelValue: $data.formData.err_msg
    }),
    T: common_vendor.p({
      name: "err_msg",
      label: "支付失败原因"
    }),
    U: common_vendor.o(($event) => $data.formData.total_fee = $event),
    V: common_vendor.p({
      placeholder: "订单总金额，单位为分，100等于1元",
      type: "number",
      modelValue: $data.formData.total_fee
    }),
    W: common_vendor.p({
      name: "total_fee",
      label: "订单总金额"
    }),
    X: common_vendor.o(($event) => $data.formData.refund_fee = $event),
    Y: common_vendor.p({
      placeholder: "订单总退款金额，单位为分，100等于1元",
      type: "number",
      modelValue: $data.formData.refund_fee
    }),
    Z: common_vendor.p({
      name: "refund_fee",
      label: "订单总退款金额"
    }),
    aa: common_vendor.o(($event) => $data.formData.refund_count = $event),
    ab: common_vendor.p({
      placeholder: "当前退款笔数 (退款单号为 out_trade_no-refund_count)",
      type: "number",
      modelValue: $data.formData.refund_count
    }),
    ac: common_vendor.p({
      name: "refund_count",
      label: "当前退款笔数"
    }),
    ad: common_vendor.o(($event) => $data.formData.refund_list = $event),
    ae: common_vendor.p({
      multiple: true,
      modelValue: $data.formData.refund_list
    }),
    af: common_vendor.p({
      name: "refund_list",
      label: "退款详情"
    }),
    ag: common_vendor.o(($event) => $data.formData.provider_appid = $event),
    ah: common_vendor.p({
      placeholder: "公众号appid，小程序appid，app开放平台appid 等",
      trim: "both",
      modelValue: $data.formData.provider_appid
    }),
    ai: common_vendor.p({
      name: "provider_appid",
      label: "开放平台appid"
    }),
    aj: common_vendor.o(($event) => $data.formData.appid = $event),
    ak: common_vendor.p({
      placeholder: "dcloud_appid",
      trim: "both",
      modelValue: $data.formData.appid
    }),
    al: common_vendor.p({
      name: "appid",
      label: "DCloud AppId"
    }),
    am: common_vendor.o(($event) => _ctx.binddata("user_order_success", $event.detail.value)),
    an: $data.formData.user_order_success,
    ao: common_vendor.p({
      name: "user_order_success",
      label: "回调状态"
    }),
    ap: common_vendor.o(($event) => $data.formData.pay_date = $event),
    aq: common_vendor.p({
      ["return-type"]: "timestamp",
      modelValue: $data.formData.pay_date
    }),
    ar: common_vendor.p({
      name: "pay_date",
      label: "支付时间"
    }),
    as: common_vendor.o(($event) => $data.formData.notify_date = $event),
    at: common_vendor.p({
      ["return-type"]: "timestamp",
      modelValue: $data.formData.notify_date
    }),
    av: common_vendor.p({
      name: "notify_date",
      label: "异步通知时间"
    }),
    aw: common_vendor.o(($event) => $data.formData.cancel_date = $event),
    ax: common_vendor.p({
      ["return-type"]: "timestamp",
      modelValue: $data.formData.cancel_date
    }),
    ay: common_vendor.p({
      name: "cancel_date",
      label: "取消时间"
    }),
    az: common_vendor.o(($event) => $data.formData.refund_date = $event),
    aA: common_vendor.p({
      ["return-type"]: "timestamp",
      modelValue: $data.formData.refund_date
    }),
    aB: common_vendor.p({
      name: "refund_date",
      label: "最近退款时间"
    }),
    aC: common_vendor.o((...args) => $options.submit && $options.submit(...args)),
    aD: common_vendor.sr("form", "11a319e2-0"),
    aE: common_vendor.p({
      model: $data.formData,
      ["validate-trigger"]: "submit",
      ["err-show-type"]: "toast"
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/pages_admin/uni-pay-orders/add.js.map
