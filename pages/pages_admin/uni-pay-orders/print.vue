<template>
  <view class="print-page">
    <!-- 操作栏（打印时不显示） -->
    <view class="no-print action-bar">
      <button class="btn-export" type="primary" @click="doExportPdf">导出 PDF</button>
      <button class="btn-print" @click="doPrint">打印</button>
      <button class="btn-back" @click="goBack">返回</button>
    </view>

    <!-- 打印区域 -->
    <view class="print-sheet" id="printArea">
      <!-- 标题 -->
      <view class="sheet-title">{{ sheetTitle }}</view>

      <!-- 订单信息 -->
      <view class="section">
        <view class="section-title">订单信息</view>
        <view class="info-row">
          <text>订单号：{{ order.order_no }}</text>
          <text>创建时间：{{ formatDate(order.create_date) }}</text>
        </view>
        <view class="info-row">
          <text>状态：{{ getStatusText(order) }}</text>
          <text v-if="order.is_pre_order">类型：预售订单</text>
        </view>
      </view>

      <!-- 收货信息 -->
      <view class="section">
        <view class="section-title">收货信息</view>
        <view class="info-grid">
          <view class="info-item"><text class="label">收货人/单位：</text><text>{{ order.user_address.user_name }}</text></view>
          <view class="info-item"><text class="label">电话：</text><text>{{ order.user_address.mobile }}</text></view>
          <view class="info-item full"><text class="label">地址：</text><text>{{ order.user_address.formatted_address }}</text></view>
          <view class="info-item" v-if="order.user_address.alias"><text class="label">地址别名：</text><text>{{ order.user_address.alias || '-' }}</text></view>
          <view class="info-item" v-if="order.remark"><text class="label">备注：</text><text>{{ order.remark }}</text></view>
        </view>
      </view>

      <!-- 商品清单 -->
      <view class="section">
        <view class="section-title">商品清单</view>
        <view class="goods-table">
          <view class="table-header">
            <view class="th barcode-col">条形码</view>
            <view class="th name-col">商品名称</view>
            <view class="th spec-col">规格</view>
            <view class="th price-col">单价</view>
            <view class="th count-col">数量</view>
            <view class="th total-col">小计</view>
          </view>
          <view v-for="(good, idx) in order.goods_list" :key="idx" class="table-row">
            <view class="td barcode-col">
              <image
                v-if="getBarcodeUrl(good.sku)"
                class="barcode-img"
                :src="getBarcodeUrl(good.sku)"
                mode="aspectFit"
              />
              <text v-else class="barcode-fallback">{{ good.sku || '-' }}</text>
            </view>
            <view class="td name-col">{{ good.name }}</view>
            <view class="td spec-col">{{ good.standard || '-' }}</view>
            <view class="td price-col">¥{{ formatPrice(good.price) }}</view>
            <view class="td count-col">{{ good.count }}</view>
            <view class="td total-col">¥{{ formatPrice(good.total) }}</view>
          </view>
        </view>
      </view>

      <!-- 汇总 -->
      <view class="summary">
        <view class="summary-row">
          <text>商品件数：{{ totalCount }} 件</text>
          <text class="summary-total">合计金额：¥{{ formatPrice(order.total_amount) }}</text>
        </view>
        <view class="summary-row">
          <text>获得积分：{{ formatPrice(order.score_earned) }}</text>
        </view>
      </view>

      <!-- 页脚 -->
      <view class="sheet-footer">
        <text>打印时间：{{ printTime }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { formatPrice, getEAN13BarcodeUrl, formatDate } from '../../../utils/common.js';

const db = uniCloud.database();

export default {
  data() {
    return {
      orderId: '',
      order: {
		  _id:'',
        user_address: {},
        goods_list: []
      },
      printTime: ''
    };
  },
  computed: {
    totalCount() {
      if (!this.order.goods_list) return 0;
      return this.order.goods_list.reduce((sum, g) => sum + (g.count || 0), 0);
    },
    sheetTitle() {
      return this.buildFileName();
    }
  },
  onLoad(options) {
    if (!options.id) {
      uni.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1500);
      return;
    }
    this.orderId = options.id;
    this.printTime = this.formatDate(Date.now());
    this.loadOrder();
  },
  methods: {
    formatPrice,
    formatDate,
    getBarcodeUrl(sku) {
      return getEAN13BarcodeUrl(sku);
    },
    getStatusText(order) {
      const map = { 0: '待发货', 1: '配送中', 2: '已收货', 3: '已取消' };
      let text = map[order.status] || '未知';
      if (order.status === 3 && order.admin_cancelled) text = '(后台)已取消';
      if (order.status === 2 && order.admin_completed) text = '(后台)已收货';
      return text;
    },
    async loadOrder() {
      uni.showLoading({ title: '加载中...' });
      try {
        const res = await db.collection('uni-pay-orders').doc(this.orderId).get();
        const data = res.result && Array.isArray(res.result.data) ? res.result.data[0] : (res.result ? res.result.data : null);
        if (!data) {
          uni.showToast({ title: '订单不存在', icon: 'none' });
          setTimeout(() => uni.navigateBack(), 1500);
          return;
        }
        this.order = data;
        this.$nextTick(() => {
          const fileName = this.buildFileName();
          uni.setNavigationBarTitle({ title: fileName });
        });
      } catch (err) {
        console.error('加载订单失败', err);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    buildFileName() {
      const order = this.order;
      const street_name = (order.user_address && order.user_address.street_name || '').replace(/[\\/:*?"<>|]/g, '').substring(0, 12);
      const name = (order.user_address && order.user_address.user_name || '').replace(/[\\/:*?"<>|]/g, '');
      const telNumber = (order.user_address && order.user_address.mobile || '').replace(/[\\/:*?"<>|]/g, '');
      const now = new Date();
      const timeStr =  ` ${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}--${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`
      return `${street_name}-${name}-${telNumber}-${timeStr}`;
    },
    // ========== 导出 PDF ==========
    async doExportPdf(force = false) {
      // 如果已有 PDF 且未强制重新生成，直接复用
      // 注意：云存储临时链接可能过期，如果后续下载失败会自动回退重新生成
      if (!force && this.order.pdf_file_url) {
        this.showPdfActions(this.order.pdf_file_url, true);
        return;
      }

      uni.showLoading({ title: '生成PDF中...', mask: true });
      try {
        const res = await uniCloud.callFunction({
          name: 'generateOrderPdf',
          data: { orderId: this.orderId }
        });

        if (res.result.code !== 0) {
          throw new Error(res.result.message || '生成PDF失败');
        }

        const { fileUrl } = res.result.data;

        // 更新本地数据
        this.order.pdf_file_url = fileUrl;

        uni.hideLoading();
        this.showPdfActions(fileUrl, false);

      } catch (err) {
        uni.hideLoading();
        console.error('导出PDF失败', err);
        uni.showToast({ title: err.message || '导出失败', icon: 'none' });
      }
    },
    // 显示 PDF 操作选项
    // cached 表示这个 url 是从本地缓存取的，可能已过期
    showPdfActions(fileUrl, cached = false) {
      uni.showActionSheet({
        title: 'PDF已就绪',
        itemList: ['预览PDF', '复制下载链接', '重新生成'],
        success: (e) => {
          if (e.tapIndex === 0) {
            // 预览
            uni.showLoading({ title: '下载中...' });
            uni.downloadFile({
              url: fileUrl,
              success: (downloadRes) => {
                uni.hideLoading();
                uni.openDocument({
                  filePath: downloadRes.tempFilePath,
                  fileType: 'pdf',
                  showMenu: true
                });
              },
              fail: (err) => {
                uni.hideLoading();
                console.error('下载PDF失败', err);
                if (cached) {
                  uni.showModal({
                    title: '链接已过期',
                    content: '本地缓存的PDF链接已失效，是否重新生成？',
                    success: (res) => {
                      if (res.confirm) {
                        this.doExportPdf(true);
                      }
                    }
                  });
                } else {
                  uni.showToast({ title: '下载失败，请重试', icon: 'none' });
                }
              }
            });
          } else if (e.tapIndex === 1) {
            // 复制链接
            uni.setClipboardData({
              data: fileUrl,
              success: () => uni.showToast({ title: '链接已复制', icon: 'success' })
            });
          } else if (e.tapIndex === 2) {
            // 重新生成：清除本地缓存，再次调用
            this.order.pdf_file_url = '';
            this.doExportPdf(true);
          }
        }
      });
    },
    // ========== 打印（仅H5） ==========
    doPrint() {
      // #ifndef H5
      uni.showModal({
        content: '打印功能仅支持在浏览器/H5环境中使用，请在电脑浏览器中打开本页面。',
        showCancel: false
      });
      return;
      // #endif
      // #ifdef H5
      const originalTitle = document.title;
      const fileName = this.buildFileName();
      document.title = fileName;
      window.print();
      document.title = originalTitle;
      // #endif
    },
   goBack() {
     uni.showModal({
       title: '确认回退',
       content: '返回会将订单状态回退到【待发货】',
       confirmText: '确认回退',
       showCancel: false,
       confirmColor: '#ff6000',
       success: async (res) => {
         if (!res.confirm) return;  // 虽然只有一个按钮，但保险起见
         
         uni.showLoading({ title: '处理中...' });
         try {
           await db.collection('uni-pay-orders').doc(this.order._id).update({
             status: 0,
             update_date: Date.now()
           });
           uni.hideLoading();
           uni.showToast({ 
             title: '已回退', 
             icon: 'success',
             complete: () => setTimeout(() => uni.navigateBack(), 500)
           });
         } catch (err) {
           uni.hideLoading();
           uni.showModal({
             content: '回退失败: ' + (err.message || JSON.stringify(err)),
             showCancel: false,
             //success: () => uni.navigateBack()  // 失败也返回
           });
         }
       }
     });
   }
  }
};
</script>

<style scoped>
/* 页面背景 */
.print-page {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}
.btn-export, .btn-print, .btn-back {
  margin: 0;
  padding: 8px 20px;
  font-size: 14px;
  border-radius: 4px;
  line-height: 1.5;
}
.btn-export {
  background-color: #007aff;
  color: #fff;
}
.btn-print {
  background-color: #52c41a;
  color: #fff;
}
.btn-back {
  background-color: #f5f5f5;
  color: #666;
}

/* A4 打印纸区域 */
.print-sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background-color: #fff;
  padding: 20mm;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

/* 标题 */
.sheet-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #333;
  color: #333;
}

/* 区块 */
.section {
  margin-bottom: 16px;
}
.section-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #007aff;
}

/* 信息行 */
.info-row {
  display: flex;
  gap: 24px;
  font-size: 12px;
  color: #555;
  margin-bottom: 4px;
}
.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}
.info-item {
  display: flex;
  font-size: 12px;
  color: #555;
  width: calc(50% - 12px);
}
.info-item.full {
  width: 100%;
}
.info-item .label {
  color: #888;
  flex-shrink: 0;
}

/* 商品表格 */
.goods-table {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}
.table-header, .table-row {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 6px 8px;
}
.table-header {
  background-color: #f5f5f5;
  font-size: 12px;
  font-weight: bold;
  color: #333;
  border-bottom: 1px solid #ddd;
}
.table-row {
  font-size: 12px;
  color: #555;
  border-bottom: 1px solid #eee;
}
.table-row:last-child {
  border-bottom: none;
}
.th, .td {
  padding: 0 4px;
  word-break: break-all;
}
.barcode-col { width: 100px; text-align: center; flex-shrink: 0; }
.name-col { flex: 1.5; }
.spec-col { width: 80px; flex-shrink: 0; }
.price-col { width: 70px; text-align: right; flex-shrink: 0; }
.count-col { width: 50px; text-align: center; flex-shrink: 0; }
.total-col { width: 70px; text-align: right; flex-shrink: 0; }

.barcode-img {
  width: 90px;
  height: 36px;
}
.barcode-fallback {
  font-size: 11px;
  color: #999;
}

/* 汇总 */
.summary {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px solid #333;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #555;
  margin-bottom: 6px;
}
.summary-total {
  font-size: 14px;
  font-weight: bold;
  color: #ff6000;
}

/* 页脚 */
.sheet-footer {
  margin-top: 24px;
  text-align: right;
  font-size: 11px;
  color: #999;
}

/* 打印样式 */
@media print {
  .no-print {
    display: none !important;
  }
  .print-page {
    background-color: #fff;
    padding: 0;
  }
  .print-sheet {
    width: 100%;
    box-shadow: none;
    padding: 10mm;
    margin: 0;
  }
  body, view, text, image {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>