<template>
  <view class="app-container">
    <scroll-view class="tree-scroll" scroll-y>
      <!-- 省份层级 -->
      <view v-for="p in config.provinces" :key="p.code" class="region-card">
        <view class="region-row level-1">
          <text class="region-name">{{ p.name }}</text>
          <text class="region-code">{{ p.code }}</text>
          <button class="app-action-btn app-action-btn-delete" size="mini" @click="removeProvince(p.code)">删除</button>
        </view>

        <!-- 城市层级 -->
        <view v-for="c in config.cities[p.code]" :key="c.code" class="region-nest">
          <view class="region-row level-2">
            <text class="region-name">{{ c.name }}</text>
            <text class="region-code">{{ c.code }}</text>
            <button class="app-action-btn app-action-btn-delete" size="mini" @click="removeCity(p.code, c.code)">删除</button>
          </view>

          <!-- 区县层级 -->
          <view v-for="d in config.districts[c.code]" :key="d.code" class="region-nest">
            <view class="region-row level-3">
              <text class="region-name">{{ d.name }}</text>
              <text class="region-code">{{ d.code }}</text>
              <button class="app-action-btn app-action-btn-delete" size="mini" @click="removeDistrict(c.code, d.code)">删除</button>
            </view>

            <!-- 街道层级 -->
            <view v-for="s in config.streets[d.code]" :key="s.code" class="region-row level-4">
              <text class="region-name">{{ s.name }}</text>
              <text class="region-code">{{ s.code }}</text>
              <button class="app-action-btn app-action-btn-delete" size="mini" @click="removeStreet(d.code, s.code)">删除</button>
            </view>

            <!-- 添加街道 -->
            <view class="add-row level-4">
              <input :value="addStreetName" @input="e => addStreetName = e.detail.value" class="add-input" placeholder="街道名称" />
              <input :value="addStreetCode" @input="e => addStreetCode = e.detail.value" class="add-input" placeholder="编码" />
              <button class="app-action-btn app-action-btn-confirm" size="mini" @click="addStreet(d.code)">添加</button>
            </view>
          </view>

          <!-- 添加区县 -->
          <view class="add-row level-3">
            <input :value="addDistrictName" @input="e => addDistrictName = e.detail.value" class="add-input" placeholder="区县名称" />
            <input :value="addDistrictCode" @input="e => addDistrictCode = e.detail.value" class="add-input" placeholder="编码" />
            <button class="app-action-btn app-action-btn-confirm" size="mini" @click="addDistrict(c.code)">添加</button>
          </view>
        </view>

        <!-- 添加城市 -->
        <view class="add-row level-2">
          <input :value="addCityName" @input="e => addCityName = e.detail.value" class="add-input" placeholder="城市名称" />
          <input :value="addCityCode" @input="e => addCityCode = e.detail.value" class="add-input" placeholder="编码" />
          <button class="app-action-btn app-action-btn-confirm" size="mini" @click="addCity(p.code)">添加</button>
        </view>
      </view>

      <!-- 添加省份 -->
      <view class="add-row level-1">
        <input :value="addProvinceName" @input="e => addProvinceName = e.detail.value" class="add-input" placeholder="省份名称" />
        <input :value="addProvinceCode" @input="e => addProvinceCode = e.detail.value" class="add-input" placeholder="编码" />
        <button class="app-action-btn app-action-btn-confirm" size="mini" @click="addProvince">添加</button>
      </view>

      <view v-if="config.provinces.length === 0" class="app-empty">暂无区域配置，请在上方添加</view>
    </scroll-view>

    <!-- 底部保存栏 -->
    <view class="footer-bar">
      <button type="primary" class="save-btn" @click="saveConfig">保存配置</button>
    </view>
  </view>
</template>

<script>
const db = uniCloud.database();

export default {
  data() {
    return {
      docId: '',
      config: {
        provinces: [],
        cities: {},
        districts: {},
        streets: {}
      },
      addProvinceName: '',
      addProvinceCode: '',
      addCityName: '',
      addCityCode: '',
      addDistrictName: '',
      addDistrictCode: '',
      addStreetName: '',
      addStreetCode: ''
    };
  },
  onLoad() {
    this.loadConfig();
  },
  methods: {
    async loadConfig() {
      uni.showLoading({ title: '加载中' });
      try {
        const res = await db.collection('app-region-config').limit(1).get();
        if (res.result.data && res.result.data.length > 0) {
          const data = res.result.data[0];
          this.docId = data._id;
          this.config.provinces = data.provinces || [];
          this.config.cities = data.cities || {};
          this.config.districts = data.districts || {};
          this.config.streets = data.streets || {};
        } else {
          // 无数据时自动创建默认空配置
          const addRes = await db.collection('app-region-config').add({
            provinces: [],
            cities: {},
            districts: {},
            streets: {}
          });
          this.docId = addRes.result.id;
        }
      } catch (err) {
        console.error('加载区域配置失败', err);
        uni.showModal({ content: '加载配置失败：' + (err.message || '未知错误'), showCancel: false });
      } finally {
        uni.hideLoading();
      }
    },

    addProvince() {
      const name = this.addProvinceName;
      const code = this.addProvinceCode;
      if (!name || !code) {
        return uni.showToast({ title: '请填写完整', icon: 'none' });
      }
      if (this.config.provinces.find(p => p.code === code)) {
        return uni.showToast({ title: '编码已存在', icon: 'none' });
      }
      this.config.provinces.push({ name, code });
      this.config.cities[code] = [];
      this.addProvinceName = '';
      this.addProvinceCode = '';
    },

    addCity(parentCode) {
      const name = this.addCityName;
      const code = this.addCityCode;
      if (!name || !code) {
        return uni.showToast({ title: '请填写完整', icon: 'none' });
      }
      const list = this.config.cities[parentCode] || [];
      if (list.find(c => c.code === code)) {
        return uni.showToast({ title: '编码已存在', icon: 'none' });
      }
      list.push({ name, code });
      this.config.cities[parentCode] = list;
      this.config.districts[code] = [];
      this.addCityName = '';
      this.addCityCode = '';
    },

    addDistrict(parentCode) {
      const name = this.addDistrictName;
      const code = this.addDistrictCode;
      if (!name || !code) {
        return uni.showToast({ title: '请填写完整', icon: 'none' });
      }
      const list = this.config.districts[parentCode] || [];
      if (list.find(d => d.code === code)) {
        return uni.showToast({ title: '编码已存在', icon: 'none' });
      }
      list.push({ name, code });
      this.config.districts[parentCode] = list;
      this.config.streets[code] = [];
      this.addDistrictName = '';
      this.addDistrictCode = '';
    },

    addStreet(parentCode) {
      const name = this.addStreetName;
      const code = this.addStreetCode;
      if (!name || !code) {
        return uni.showToast({ title: '请填写完整', icon: 'none' });
      }
      const list = this.config.streets[parentCode] || [];
      if (list.find(s => s.code === code)) {
        return uni.showToast({ title: '编码已存在', icon: 'none' });
      }
      list.push({ name, code });
      this.config.streets[parentCode] = list;
      this.addStreetName = '';
      this.addStreetCode = '';
    },

    removeProvince(code) {
      uni.showModal({
        title: '确认删除',
        content: '删除省份将同时删除其下所有城市、区县和街道，确定吗？',
        success: (res) => {
          if (res.confirm) {
            this.config.provinces = this.config.provinces.filter(p => p.code !== code);
            const cities = this.config.cities[code] || [];
            cities.forEach(c => {
              const districts = this.config.districts[c.code] || [];
              districts.forEach(d => {
                delete this.config.streets[d.code];
              });
              delete this.config.districts[c.code];
            });
            delete this.config.cities[code];
          }
        }
      });
    },

    removeCity(pCode, cCode) {
      uni.showModal({
        title: '确认删除',
        content: '删除城市将同时删除其下所有区县和街道，确定吗？',
        success: (res) => {
          if (res.confirm) {
            const list = this.config.cities[pCode] || [];
            this.config.cities[pCode] = list.filter(c => c.code !== cCode);
            const districts = this.config.districts[cCode] || [];
            districts.forEach(d => {
              delete this.config.streets[d.code];
            });
            delete this.config.districts[cCode];
          }
        }
      });
    },

    removeDistrict(cCode, dCode) {
      uni.showModal({
        title: '确认删除',
        content: '删除区县将同时删除其下所有街道，确定吗？',
        success: (res) => {
          if (res.confirm) {
            const list = this.config.districts[cCode] || [];
            this.config.districts[cCode] = list.filter(d => d.code !== dCode);
            delete this.config.streets[dCode];
          }
        }
      });
    },

    removeStreet(dCode, sCode) {
      const list = this.config.streets[dCode] || [];
      this.config.streets[dCode] = list.filter(s => s.code !== sCode);
    },

    async saveConfig() {
      if (!this.docId) {
        return uni.showToast({ title: '配置未加载', icon: 'none' });
      }
      uni.showLoading({ title: '保存中', mask: true });
      try {
        await db.collection('app-region-config').doc(this.docId).update({
          provinces: this.config.provinces,
          cities: this.config.cities,
          districts: this.config.districts,
          streets: this.config.streets,
          update_date: Date.now()
        });
        uni.hideLoading();
        uni.showToast({ title: '保存成功', icon: 'success' });
      } catch (err) {
        uni.hideLoading();
        console.error('保存区域配置失败', err);
        uni.showModal({ content: err.message || '保存失败', showCancel: false });
      }
    }
  }
};
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}
.tree-scroll {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}
.region-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.region-nest {
  margin-left: 12px;
  margin-top: 6px;
  padding-left: 8px;
  border-left: 2px solid #eee;
}
.region-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
}
.region-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  flex: 1;
}
.region-code {
  font-size: 12px;
  color: #999;
  margin-right: 10px;
}
.level-1 .region-name { font-size: 16px; font-weight: bold; color: #007aff; }
.level-2 .region-name { font-size: 15px; color: #333; }
.level-3 .region-name { font-size: 14px; color: #555; }
.level-4 .region-name { font-size: 13px; color: #666; }
.add-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px;
  background-color: #f9f9f9;
  border-radius: 6px;
}
.add-row.level-1 { background-color: #e6f2ff; }
.add-row.level-2 { background-color: #f0f9eb; }
.add-row.level-3 { background-color: #fdf6ec; }
.add-row.level-4 { background-color: #f4f4f5; }
.add-input {
  flex: 1;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 13px;
  background-color: #fff;
}
.footer-bar {
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}
.save-btn {
  height: 44px;
  line-height: 44px;
  border-radius: 22px;
  font-size: 15px;
}
.app-empty {
  text-align: center;
  color: #999;
  padding: 30px;
  font-size: 14px;
}
</style>
