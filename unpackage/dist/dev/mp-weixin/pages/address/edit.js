"use strict";
const common_vendor = require("../../common/vendor.js");
require("../../uni_modules/uni-id-pages/common/store.js");
const db = common_vendor.tr.database();
const _sfc_main = {
  data() {
    return {
      id: "",
      formData: {
        name: "",
        mobile: "",
        alias: "",
        province_code: "",
        province_name: "",
        city_code: "",
        city_name: "",
        district_code: "",
        district_name: "",
        street_code: "",
        street_name: "",
        address: "",
        is_default: false,
        zip_code: "",
        email: ""
      },
      // 静态行政区划数据
      regionStatic: {
        provinces: [
          { code: "51", name: "四川省" }
          // { code: '50', name: '重庆市' }
        ],
        cities: {
          "51": [{ code: "5117", name: "达州市" }],
          "50": [{ code: "5001", name: "市辖区" }]
        },
        districts: {
          "5117": [
            // { code: '511703', name: '达川区' },
            { code: "511723", name: "开江县" }
          ],
          "5001": [
            { code: "500154", name: "开州区" },
            { code: "500155", name: "梁平区" }
          ]
        },
        streets: {
          "511703": [
            { code: "511703001", name: "三里坪街道" }
            // ... 其他乡镇可补充
          ],
          "511723": [
            { code: "511723001", name: "任市" },
            { code: "511723002", name: "广福" },
            { code: "511723003", name: "长岭" },
            { code: "511723004", name: "八庙" },
            { code: "511723005", name: "新街" },
            { code: "511723006", name: "靖安" },
            { code: "511723007", name: "甘棠" },
            { code: "511723008", name: "宝石" },
            { code: "511723009", name: "讲治" }
            // ...
          ],
          "500154": [
            { code: "500154001", name: "汉丰街道" }
            // ...
          ],
          "500155": [
            { code: "500155001", name: "梁山街道" }
            // ...
          ]
        }
      },
      regionColumns: [[], [], [], []],
      regionIndex: [0, 0, 0, 0],
      selectedProvince: null,
      selectedCity: null,
      selectedDistrict: null,
      selectedStreet: null,
      rules: {
        name: { rules: [{ required: true, errorMessage: "请输入姓名" }] },
        mobile: {
          rules: [
            { required: true, errorMessage: "请输入手机号" },
            { pattern: /^1[3-9]\d{9}$/, errorMessage: "手机号格式错误" }
          ]
        },
        address: { rules: [{ required: true, errorMessage: "请输入详细地址" }] }
      }
    };
  },
  computed: {
    regionText() {
      const parts = [
        this.formData.province_name,
        this.formData.city_name,
        this.formData.district_name,
        this.formData.street_name
      ].filter((v) => v);
      return parts.join(" ") || "";
    }
  },
  onLoad(options) {
    if (options.id) {
      this.id = options.id;
      this.loadAddress();
    }
    this.loadRegionData();
  },
  methods: {
    // 加载地址数据
    async loadAddress() {
      common_vendor.index.showLoading({ title: "加载中" });
      try {
        const res = await db.collection("uni-id-address").doc(this.id).get();
        const data = res.result.data[0];
        if (data) {
          this.formData = data;
          this.setRegionIndexByCode();
        }
      } catch (err) {
        common_vendor.index.showModal({ content: err.message || "加载失败", showCancel: false });
      } finally {
        common_vendor.index.hideLoading();
      }
    },
    // 根据编码设置地区索引
    setRegionIndexByCode() {
      const { province_code, city_code, district_code, street_code } = this.formData;
      const provinceIndex = this.regionStatic.provinces.findIndex((p) => p.code === province_code);
      if (provinceIndex === -1)
        return;
      this.selectedProvince = this.regionStatic.provinces[provinceIndex];
      this.loadCities(this.selectedProvince.code);
      this.$nextTick(() => {
        const cities = this.regionStatic.cities[province_code] || [];
        const cityIndex = cities.findIndex((c) => c.code === city_code);
        if (cityIndex === -1)
          return;
        this.selectedCity = cities[cityIndex];
        this.loadDistricts(this.selectedCity.code);
        this.$nextTick(() => {
          const districts = this.regionStatic.districts[city_code] || [];
          const districtIndex = districts.findIndex((d) => d.code === district_code);
          if (districtIndex === -1)
            return;
          this.selectedDistrict = districts[districtIndex];
          this.loadStreets(this.selectedDistrict.code);
          this.$nextTick(() => {
            const streets = this.regionStatic.streets[district_code] || [];
            const streetIndex = streets.findIndex((s) => s.code === street_code);
            this.regionIndex = [
              provinceIndex,
              cityIndex,
              districtIndex,
              streetIndex >= 0 ? streetIndex : 0
            ];
            if (streetIndex >= 0) {
              this.selectedStreet = streets[streetIndex];
            }
          });
        });
      });
    },
    // 初始化加载省份
    loadRegionData() {
      if (this.regionStatic.provinces.length === 0)
        return;
      this.regionColumns[0] = this.regionStatic.provinces.map((p) => p.name);
    },
    loadCities(provinceCode) {
      const cities = this.regionStatic.cities[provinceCode] || [];
      this.regionColumns[1] = cities.map((c) => c.name);
    },
    loadDistricts(cityCode) {
      const districts = cityCode ? this.regionStatic.districts[cityCode] || [] : [];
      this.regionColumns[2] = districts.map((d) => d.name);
    },
    loadStreets(districtCode) {
      const streets = districtCode ? this.regionStatic.streets[districtCode] || [] : [];
      this.regionColumns[3] = streets.map((s) => s.name);
    },
    onColumnChange(e) {
      const { column, value } = e.detail;
      const newIndex = [...this.regionIndex];
      newIndex[column] = value;
      this.regionIndex = newIndex;
      if (column === 0) {
        const province = this.regionStatic.provinces[value];
        if (province) {
          this.selectedProvince = province;
          this.formData.province_code = province.code;
          this.formData.province_name = province.name;
          this.loadCities(province.code);
          this.regionIndex = [value, 0, 0, 0];
        }
      } else if (column === 1) {
        const cities = this.regionStatic.cities[this.selectedProvince.code] || [];
        const city = cities[value];
        if (city) {
          this.selectedCity = city;
          this.formData.city_code = city.code;
          this.formData.city_name = city.name;
          this.loadDistricts(city.code);
          this.regionIndex = [this.regionIndex[0], value, 0, 0];
        }
      } else if (column === 2) {
        const districts = this.regionStatic.districts[this.selectedCity.code] || [];
        const district = districts[value];
        if (district) {
          this.selectedDistrict = district;
          this.formData.district_code = district.code;
          this.formData.district_name = district.name;
          this.loadStreets(district.code);
          this.regionIndex = [this.regionIndex[0], this.regionIndex[1], value, 0];
        }
      }
    },
    onRegionChange(e) {
      const values = e.detail.value;
      const province = this.regionStatic.provinces[values[0]];
      if (province) {
        this.formData.province_code = province.code;
        this.formData.province_name = province.name;
      }
      const cities = this.regionStatic.cities[province == null ? void 0 : province.code] || [];
      const city = cities[values[1]];
      if (city) {
        this.formData.city_code = city.code;
        this.formData.city_name = city.name;
      }
      const districts = this.regionStatic.districts[city == null ? void 0 : city.code] || [];
      const district = districts[values[2]];
      if (district) {
        this.formData.district_code = district.code;
        this.formData.district_name = district.name;
      }
      const streets = this.regionStatic.streets[district == null ? void 0 : district.code] || [];
      const street = streets[values[3]];
      if (street) {
        this.formData.street_code = street.code;
        this.formData.street_name = street.name;
      }
    },
    async submit() {
      await this.$refs.form.validate();
      if (!this.formData.district_code) {
        return common_vendor.index.showToast({ title: "请选择所在地区", icon: "none" });
      }
      this.formData.formatted_address = this.regionText + " " + this.formData.address;
      const { _id, user_id, create_date, ...updateData } = this.formData;
      updateData.update_date = Date.now();
      common_vendor.index.showLoading({ title: "保存中" });
      try {
        await db.collection("uni-id-address").doc(this.id).update(updateData);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "修改成功", icon: "success" });
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit("refreshData");
        setTimeout(() => common_vendor.index.navigateBack(), 500);
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/address/edit.vue:315", "更新失败", err);
        common_vendor.index.showModal({ content: err.message || "保存失败", showCancel: false });
      }
    }
  }
};
if (!Array) {
  const _easycom_uni_easyinput2 = common_vendor.resolveComponent("uni-easyinput");
  const _easycom_uni_forms_item2 = common_vendor.resolveComponent("uni-forms-item");
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  const _easycom_uni_forms2 = common_vendor.resolveComponent("uni-forms");
  (_easycom_uni_easyinput2 + _easycom_uni_forms_item2 + _easycom_uni_icons2 + _easycom_uni_forms2)();
}
const _easycom_uni_easyinput = () => "../../uni_modules/uni-easyinput/components/uni-easyinput/uni-easyinput.js";
const _easycom_uni_forms_item = () => "../../uni_modules/uni-forms/components/uni-forms-item/uni-forms-item.js";
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
const _easycom_uni_forms = () => "../../uni_modules/uni-forms/components/uni-forms/uni-forms.js";
if (!Math) {
  (_easycom_uni_easyinput + _easycom_uni_forms_item + _easycom_uni_icons + _easycom_uni_forms)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => $data.formData.name = $event),
    b: common_vendor.p({
      placeholder: "请输入姓名/商家/单位",
      modelValue: $data.formData.name
    }),
    c: common_vendor.p({
      label: "收货人",
      name: "name",
      required: true
    }),
    d: common_vendor.o(($event) => $data.formData.mobile = $event),
    e: common_vendor.p({
      placeholder: "请输入手机号",
      type: "number",
      maxlength: "11",
      modelValue: $data.formData.mobile
    }),
    f: common_vendor.p({
      label: "手机号",
      name: "mobile",
      required: true
    }),
    g: common_vendor.o(($event) => $data.formData.alias = $event),
    h: common_vendor.p({
      placeholder: "如：1店/2店等",
      modelValue: $data.formData.alias
    }),
    i: common_vendor.p({
      label: "地址别名",
      name: "alias"
    }),
    j: common_vendor.t($options.regionText || "请选择省/市/区/街道"),
    k: common_vendor.p({
      type: "arrowdown",
      size: "16",
      color: "#999"
    }),
    l: $data.regionColumns,
    m: common_vendor.o((...args) => $options.onRegionChange && $options.onRegionChange(...args)),
    n: common_vendor.o((...args) => $options.onColumnChange && $options.onColumnChange(...args)),
    o: $data.regionIndex,
    p: common_vendor.p({
      label: "所在地区",
      name: "region",
      required: true
    }),
    q: common_vendor.o(($event) => $data.formData.address = $event),
    r: common_vendor.p({
      placeholder: "请输入道路、门牌号等",
      modelValue: $data.formData.address
    }),
    s: common_vendor.p({
      label: "详细地址",
      name: "address",
      required: true
    }),
    t: $data.formData.is_default,
    v: common_vendor.o(($event) => $data.formData.is_default = $event.detail.value),
    w: common_vendor.p({
      label: "设为默认",
      name: "is_default"
    }),
    x: common_vendor.o((...args) => $options.submit && $options.submit(...args)),
    y: common_vendor.sr("form", "dcb1f0d8-0"),
    z: common_vendor.p({
      modelValue: $data.formData,
      rules: $data.rules,
      ["validate-trigger"]: "submit"
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-dcb1f0d8"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/address/edit.js.map
