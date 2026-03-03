<template>
  <view class="uni-container">
    <uni-forms ref="form" :modelValue="formData" :rules="rules" validate-trigger="submit">
      <!-- 收货人 -->
      <uni-forms-item label="收货人/商家/单位" name="name" required>
        <uni-easyinput v-model="formData.name" placeholder="请输入收货人/商家/单位" />
      </uni-forms-item>
      <!-- 手机号 -->
      <uni-forms-item label="手机号(可修改)" name="mobile" required>
        <uni-easyinput v-model="formData.mobile" placeholder="请输入手机号" type="number" maxlength="11" />
      </uni-forms-item>
      <!-- 地址别名 -->
      <uni-forms-item label="地址命名" name="alias">
        <uni-easyinput v-model="formData.alias" placeholder="如：xx1店、xx2店" />
      </uni-forms-item>

      <!-- 所在地区 - 级联选择 -->
      <uni-forms-item label="所在地区(点击选择)" name="region" required>
        <picker
          mode="multiSelector"
          :range="regionColumns"
          @change="onRegionChange"
          @columnchange="onColumnChange"
          :value="regionIndex"
          class="region-picker"
        >
          <view class="region-picker-display">
            <text class="region-text">{{ regionText || '请选择省/市/区/街道' }}</text>
            <uni-icons type="arrowdown" size="16" color="#999"></uni-icons>
          </view>
        </picker>
      </uni-forms-item>

      <!-- 详细地址 -->
      <uni-forms-item label="详细地址" name="address" required>
        <uni-easyinput v-model="formData.address" placeholder="请输入街道、门牌号等" />
      </uni-forms-item>

      <!-- 设为默认 -->
      <uni-forms-item label="设为默认" name="is_default">
        <switch :checked="formData.is_default" @change="formData.is_default = $event.detail.value" />
      </uni-forms-item>

      <button type="primary" @click="submit">保存</button>
    </uni-forms>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();

export default {
  data() {
    return {
      formData: {
        name: '',
        mobile: '',
        alias: '',
        province_code: '',
        province_name: '',
        city_code: '',
        city_name: '',
        district_code: '',
        district_name: '',
        street_code: '',
        street_name: '',
        address: '',
        is_default: true
      },
      // 静态行政区划数据
      regionStatic: {
        provinces: [
          { code: '51', name: '四川省' },
          // { code: '50', name: '重庆市' }
        ],
        cities: {
          '51': [{ code: '5117', name: '达州市' }],
          '50': [{ code: '5001', name: '市辖区' }]
        },
        districts: {
          '5117': [
            // { code: '511703', name: '达川区' },
            { code: '511723', name: '开江县' }
          ],
          '5001': [
            { code: '500154', name: '开州区' },
            { code: '500155', name: '梁平区' }
          ]
        },
        streets: {
          '511703': [
            { code: '511703001', name: '三里坪街道' }
            // ... 其他乡镇可补充
          ],
          '511723': [
            { code: '511723001', name: '任市' },
			 { code: '511723002', name: '广福' },
			  { code: '511723003', name: '长岭' },
			   { code: '511723004', name: '八庙' },
			    { code: '511723005', name: '新街' },
				 { code: '511723006', name: '靖安' },
				  { code: '511723007', name: '甘棠' },
				   { code: '511723008', name: '宝石' },
				    { code: '511723009', name: '讲治' }
					
			
            // ...
          ],
          '500154': [
            { code: '500154001', name: '汉丰街道' }
            // ...
          ],
          '500155': [
            { code: '500155001', name: '梁山街道' }
            // ...
          ]
        }
      },
      // 当前显示的列数据
      regionColumns: [[], [], [], []],
      // 当前选中的索引
      regionIndex: [0, 0, 0, 0],
      // 当前已选择的省、市、区、街道对象
      selectedProvince: null,
      selectedCity: null,
      selectedDistrict: null,
      selectedStreet: null,
      rules: {
        name: { rules: [{ required: true, errorMessage: '请输入姓名' }] },
        mobile: {
          rules: [
            { required: true, errorMessage: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, errorMessage: '手机号格式错误' }
          ]
        },
        address: { rules: [{ required: true, errorMessage: '请输入详细地址' }] }
      }
    };
  },
  computed: {
    // 显示完整地址（省市区街道）
    regionText() {
      const parts = [
        this.formData.province_name,
        this.formData.city_name,
        this.formData.district_name,
        this.formData.street_name
      ].filter(v => v);
      return parts.join(' ') || '';
    }
  },
  created() {
    // 优先填充用户本人手机号
    const userInfo = store.userInfo;
    if (userInfo && userInfo.mobile) {
      this.formData.mobile = userInfo.mobile;
    }
    this.loadRegionData();
  },
  methods: {
    // 初始化加载省份
    loadRegionData() {
      if (this.regionStatic.provinces.length === 0) return;
      this.regionColumns[0] = this.regionStatic.provinces.map(p => p.name);
      this.selectedProvince = this.regionStatic.provinces[0];
      this.formData.province_code = this.selectedProvince.code;
      this.formData.province_name = this.selectedProvince.name;
      this.loadCities(this.selectedProvince.code);
    },
    // 加载城市
    loadCities(provinceCode) {
      const cities = this.regionStatic.cities[provinceCode] || [];
      this.regionColumns[1] = cities.map(c => c.name);
      if (cities.length > 0) {
        this.selectedCity = cities[0];
        this.formData.city_code = this.selectedCity.code;
        this.formData.city_name = this.selectedCity.name;
        this.loadDistricts(this.selectedCity.code);
      } else {
        this.selectedCity = null;
        this.formData.city_code = '';
        this.formData.city_name = '';
        this.regionColumns[2] = [];
        this.regionColumns[3] = [];
        this.loadDistricts(null);
      }
    },
    // 加载区县
    loadDistricts(cityCode) {
      const districts = cityCode ? (this.regionStatic.districts[cityCode] || []) : [];
      this.regionColumns[2] = districts.map(d => d.name);
      if (districts.length > 0) {
        this.selectedDistrict = districts[0];
        this.formData.district_code = this.selectedDistrict.code;
        this.formData.district_name = this.selectedDistrict.name;
        this.loadStreets(this.selectedDistrict.code);
      } else {
        this.selectedDistrict = null;
        this.formData.district_code = '';
        this.formData.district_name = '';
        this.regionColumns[3] = [];
        this.loadStreets(null);
      }
    },
    // 加载街道
    loadStreets(districtCode) {
      const streets = districtCode ? (this.regionStatic.streets[districtCode] || []) : [];
      this.regionColumns[3] = streets.map(s => s.name);
      if (streets.length > 0) {
        this.selectedStreet = streets[0];
        this.formData.street_code = this.selectedStreet.code;
        this.formData.street_name = this.selectedStreet.name;
      } else {
        this.selectedStreet = null;
        this.formData.street_code = '';
        this.formData.street_name = '';
      }
    },

    // 列改变时
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
      // 街道列改变时不需加载下级
    },

    // 确认选择
    onRegionChange(e) {
      const values = e.detail.value;
      const province = this.regionStatic.provinces[values[0]];
      if (province) {
        this.formData.province_code = province.code;
        this.formData.province_name = province.name;
      }
      const cities = this.regionStatic.cities[province?.code] || [];
      const city = cities[values[1]];
      if (city) {
        this.formData.city_code = city.code;
        this.formData.city_name = city.name;
      }
      const districts = this.regionStatic.districts[city?.code] || [];
      const district = districts[values[2]];
      if (district) {
        this.formData.district_code = district.code;
        this.formData.district_name = district.name;
      }
      const streets = this.regionStatic.streets[district?.code] || [];
      const street = streets[values[3]];
      if (street) {
        this.formData.street_code = street.code;
        this.formData.street_name = street.name;
      }
    },

    async submit() {
      await this.$refs.form.validate();

      if (!this.formData.district_code) {
        return uni.showToast({ title: '请选择所在地区', icon: 'none' });
      }

      // 组合完整地址
      this.formData.formatted_address = this.regionText + ' ' + this.formData.address;

      // 添加用户ID
      const userInfo = store.userInfo;
      if (!userInfo || !userInfo._id) {
        return uni.showModal({ content: '请先登录', showCancel: false });
      }
      this.formData.user_id = userInfo._id;

      uni.showLoading({ title: '保存中' });
      try {
        await db.collection('uni-id-address').add(this.formData);
        uni.hideLoading();
        uni.showToast({ title: '新增成功', icon: 'success' });
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit('refreshData');
        setTimeout(() => uni.navigateBack(), 500);
      } catch (err) {
        uni.hideLoading();
        uni.showModal({ content: err.message || '保存失败', showCancel: false });
      }
    }
  }
};
</script>

<style scoped>
.uni-container {
  padding: 20px;
}
.region-picker {
  width: 100%;
}
.region-picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
}
.region-text {
  color: #333;
  font-size: 14px;
}
</style>