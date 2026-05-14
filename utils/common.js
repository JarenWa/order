/**
 * 格式化日期时间
 * @param {number|string} timestamp - 时间戳
 * @param {boolean} withTime - 是否包含时间
 * @returns {string}
 */

export function formatDate(timestamp , withTime = true) {
	    if (!timestamp) return '-'
	    const date = new Date(timestamp)
	    const year = date.getFullYear()
	    const month = (date.getMonth() + 1).toString().padStart(2, '0')
	    const day = date.getDate().toString().padStart(2, '0')
		
		if (!withTime) {
		  return `${year}-${month}-${day}`;
		}
	    const hours = date.getHours().toString().padStart(2, '0')
	    const minutes = date.getMinutes().toString().padStart(2, '0')
	    return `${year}-${month}-${day} ${hours}:${minutes}`
	  }
	  
// export function formatDate(timestamp, withTime = true) {
//   if (!timestamp) return '-';
//   const date = new Date(timestamp);
//   const year = date.getFullYear();
//   const month = (date.getMonth() + 1).toString().padStart(2, '0');
//   const day = date.getDate().toString().padStart(2, '0');
//   if (!withTime) {
//     return `${year}-${month}-${day}`;
//   }
//   const hours = date.getHours().toString().padStart(2, '0');
//   const minutes = date.getMinutes().toString().padStart(2, '0');
//   return `${year}-${month}-${day} ${hours}:${minutes}`;
// }

/**
 * 格式化价格（分 -> 元）
 * @param {number} price - 价格（单位：分）
 * @param {boolean} divideBy100 - 是否需要除以100
 * @returns {string}
 */
export function formatPrice(price, divideBy100 = true) {
  if (price == null || isNaN(price)) return '0.00';
  const val = divideBy100 ? price / 100 : price;
  return val.toFixed(2);
}

/**
 * 格式化地址
 * @param {Object} addr - 地址对象
 * @returns {string}
 */
export function formatAddress(addr) {
  if (!addr) return '';
  const parts = [
    addr.province_name,
    addr.city_name,
    addr.district_name,
    addr.street_name,
    addr.address
  ].filter(v => v);
  return parts.join(' ');
}

/**
 * 从字符串或 uniCloud 上传对象中提取可用图片 URL
 * @param {string|Object} value - 图片值
 * @param {string} defaultImg - 默认图
 * @returns {string}
 */
export function extractImageUrl(value, defaultImg = '/static/tab/goods-default.png') {
  if (!value) return defaultImg;
  if (typeof value === 'string') return value || defaultImg;
  return value.url || value.path || value.fileID || defaultImg;
}

/**
 * 获取商品首图（兼容新表 goods，goods_swiper_imgs 为字符串数组或对象数组）
 * @param {Object} item - 商品对象或购物车项
 * @param {Object} options - 配置项
 * @returns {string}
 */
export function getGoodsImage(item, options = {}) {
  const defaultImg = options.defaultImg || '/static/tab/goods-default.png';
  if (!item) return defaultImg;

  // 优先读取 goodsInfo（购物车场景）
  const info = item.goodsInfo || item.good || item;

  if (info._imgError) return defaultImg;

  // 新表 goods 的 goods_thumb 为缩略图，优先使用（兼容对象格式）
  if (info.goods_thumb) {
    return extractImageUrl(info.goods_thumb, defaultImg);
  }

  // 兼容旧表 opendb-mall-goods（对象数组）与新表 goods（字符串数组或对象数组）
  if (info.goods_swiper_imgs && info.goods_swiper_imgs.length) {
    return extractImageUrl(info.goods_swiper_imgs[0], defaultImg);
  }
  return defaultImg;
}

/**
 * 订单状态映射
 * @param {number} status - 状态码
 * @param {Object} extra - 额外标记（admin_cancelled, admin_completed, admin_modified）
 * @returns {string}
 */
export function getOrderStatusText(status, extra = {}) {
  if (status === 3 && extra.admin_cancelled) {
    return '(后台)已取消';
  }
  if (status === 2 && extra.admin_completed) {
    return '(后台)已收货';
  }
  if (status === 0 && extra.admin_modified) {
    return '(后台修改)待发货';
  }
  const map = { 0: '待发货', 1: '配送中', 2: '已收货', 3: '已取消' };
  return map[status] || '未知';
}

/**
 * 计算可获得积分
 * @param {number} totalAmount - 订单总金额（单位：分）
 * @returns {number}
 */
export function calcScore(totalAmount) {
  return Math.ceil(totalAmount / 100);
}

/**
 * 图片加载失败处理
 * @param {Object} item - 数据项
 * @param {string} field - 错误标记字段名
 */
export function onImageError(item, field = '_imgError') {
  item[field] = true;
}

/**
 * 计算 EAN13 校验位
 * @param {string} digits12 - 12 位数字字符串
 * @returns {number|null} 校验位 0-9
 */
export function calcEAN13CheckDigit(digits12) {
  if (!/^\d{12}$/.test(digits12)) return null;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = parseInt(digits12[i], 10);
    sum += (i % 2 === 0) ? n : n * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * 生成标准 EAN13 码（12 位自动补校验位，13 位直接校验）
 * @param {string} code - 原始编码
 * @returns {string|null}
 */
export function formatEAN13(code) {
  if (!code) return null;
  const cleaned = String(code).replace(/\D/g, '');
  if (/^\d{13}$/.test(cleaned)) return cleaned;
  if (/^\d{12}$/.test(cleaned)) {
    const check = calcEAN13CheckDigit(cleaned);
    return cleaned + check;
  }
  return null;
}

/**
 * 获取 EAN13 条形码图片 URL（在线 API）
 * @param {string} code - SKU 或 EAN13 码
 * @returns {string|null}
 */
export function getEAN13BarcodeUrl(code) {
  const ean = formatEAN13(code);
  if (!ean) return null;
  return `https://bwipjs-api.metafloor.com/?bcid=ean13&text=${ean}&scale=2&includetext&guardwhitespace`;
}
