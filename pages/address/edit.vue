<template>
  <view class="uni-container">
    <uni-forms ref="form" :modelValue="formData" :rules="rules" validate-trigger="submit">
      <uni-forms-item label="收货人" name="name" required>
        <uni-easyinput v-model="formData.name" placeholder="请输入姓名/商家/单位" />
      </uni-forms-item>
      <uni-forms-item label="手机号" name="mobile" required>
        <uni-easyinput v-model="formData.mobile" placeholder="请输入手机号" type="number" maxlength="11" />
      </uni-forms-item>
      <uni-forms-item label="地址别名" name="alias">
        <uni-easyinput v-model="formData.alias" placeholder="如：1店/2店等" />
      </uni-forms-item>

      <!-- 行政区划选择（省市区街道） -->
      <uni-forms-item label="所在地区" name="region" required>
        <picker
          mode="multiSelector"
          :range="regionColumns"
          @change="onRegionChange"
          @columnchange="onColumnChange"
          :value="regionIndex"
        >
          <view class="region-picker">
            <text class="region-text">{{ regionText || '请选择省/市/区/街道' }}</text>
            <uni-icons type="arrowdown" size="16" color="#999"></uni-icons>
          </view>
        </picker>
      </uni-forms-item>

      <uni-forms-item label="详细地址" name="address" required>
        <uni-easyinput v-model="formData.address" placeholder="请输入道路、门牌号等" />
      </uni-forms-item>

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
      id: '',
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
        is_default: false,
        zip_code: '',
        email: ''
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
      regionColumns: [[], [], [], []],
      regionIndex: [0, 0, 0, 0],
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
      uni.showLoading({ title: '加载中' });
      try {
        const res = await db.collection('uni-id-address').doc(this.id).get();
        const data = res.result.data[0];
        if (data) {
          this.formData = data;
          this.setRegionIndexByCode();
        }
      } catch (err) {
        uni.showModal({ content: err.message || '加载失败', showCancel: false });
      } finally {
        uni.hideLoading();
      }
    },

    // 根据编码设置地区索引
    setRegionIndexByCode() {
      const { province_code, city_code, district_code, street_code } = this.formData;
      const provinceIndex = this.regionStatic.provinces.findIndex(p => p.code === province_code);
      if (provinceIndex === -1) return;

      this.selectedProvince = this.regionStatic.provinces[provinceIndex];
      this.loadCities(this.selectedProvince.code);

      this.$nextTick(() => {
        const cities = this.regionStatic.cities[province_code] || [];
        const cityIndex = cities.findIndex(c => c.code === city_code);
        if (cityIndex === -1) return;
        this.selectedCity = cities[cityIndex];
        this.loadDistricts(this.selectedCity.code);

        this.$nextTick(() => {
          const districts = this.regionStatic.districts[city_code] || [];
          const districtIndex = districts.findIndex(d => d.code === district_code);
          if (districtIndex === -1) return;
          this.selectedDistrict = districts[districtIndex];
          this.loadStreets(this.selectedDistrict.code);

          this.$nextTick(() => {
            const streets = this.regionStatic.streets[district_code] || [];
            const streetIndex = streets.findIndex(s => s.code === street_code);
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
      if (this.regionStatic.provinces.length === 0) return;
      this.regionColumns[0] = this.regionStatic.provinces.map(p => p.name);
    },
    loadCities(provinceCode) {
      const cities = this.regionStatic.cities[provinceCode] || [];
      this.regionColumns[1] = cities.map(c => c.name);
    },
    loadDistricts(cityCode) {
      const districts = cityCode ? (this.regionStatic.districts[cityCode] || []) : [];
      this.regionColumns[2] = districts.map(d => d.name);
    },
    loadStreets(districtCode) {
      const streets = districtCode ? (this.regionStatic.streets[districtCode] || []) : [];
      this.regionColumns[3] = streets.map(s => s.name);
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
      this.formData.formatted_address = this.regionText + ' ' + this.formData.address;

      // 剔除 _id, user_id, create_date 等不应更新的字段，保留 update_date 并手动设置
      const { _id, user_id, create_date, ...updateData } = this.formData;
      updateData.update_date = Date.now(); // 设置当前时间戳

      uni.showLoading({ title: '保存中' });
      try {
        await db.collection('uni-id-address').doc(this.id).update(updateData);
        uni.hideLoading();
        uni.showToast({ title: '修改成功', icon: 'success' });
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit('refreshData');
        setTimeout(() => uni.navigateBack(), 500);
      } catch (err) {
        uni.hideLoading();
        console.error('更新失败', err);
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