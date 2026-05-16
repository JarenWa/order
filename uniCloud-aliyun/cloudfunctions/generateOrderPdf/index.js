'use strict';

const fs = require('fs');
const path = require('path');
const PdfPrinter = require('pdfmake');
const bwipjs = require('bwip-js');

// pdfmake 中文字体配置
// 请将 NotoSansSC 字体文件放到本文件同级的 fonts/ 目录下
// 换NotoSerifSC
const FONT_DIR = path.join(__dirname, 'fonts');
const fonts = {
  NotoSansSC: {
    normal: path.join(FONT_DIR, 'NotoSerifSC-Regular.otf'),
    bold: path.join(FONT_DIR, 'NotoSerifSC-Bold.otf'),
    italics: path.join(FONT_DIR, 'NotoSerifSC-Regular.otf'),
    bolditalics: path.join(FONT_DIR, 'NotoSerifSC-Bold.otf')
  }
};

// 启动前检查字体文件是否存在
function checkFonts() {
  const missing = [];
  Object.values(fonts.NotoSansSC).forEach((p, idx) => {
    // 避免重复检查相同路径
    if (Object.values(fonts.NotoSansSC).indexOf(p) !== idx) return;
    if (!fs.existsSync(p)) missing.push(path.basename(p));
  });
  return missing;
}

// 状态映射
const STATUS_MAP = { 0: '待发货', 1: '配送中', 2: '已收货', 3: '已取消' };

/**
 * 生成条形码图片 (base64)
 */
async function generateBarcode(text) {
  if (!text) return null;
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'ean13',
      text: text,
      scale: 2,
      height: 12,
      includetext: false,
      textxalign: 'center',
    });
    return 'data:image/png;base64,' + png.toString('base64');
  } catch (err) {
    console.error('条形码生成失败:', text, err.message);
    return null;
  }
}

/**
 * 格式化价格（分 -> 元）
 * @param {number} price - 价格（单位：分）
 * @param {boolean} divideBy100 - 是否需要除以100
 * @returns {string}
 */
function formatPrice(price, divideBy100 = true) {
  if (price == null || isNaN(price)) return '0.00';
  const val = divideBy100 ? price / 100 : price;
  return val.toFixed(2);
}

/**
 * 金额大写转换
 * @param {number} price - 价格（单位：分）
 * @param {boolean} divideBy100 - 是否需要除以100
 * @returns {string}
 */
function amountToChinese(price, divideBy100 = true) {
  if (price == null || isNaN(price) || price === 0) return '零元整';
  const val = divideBy100 ? price / 100 : price;
  const n = Number(val.toFixed(2));

  const fraction = ['角', '分'];
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = [
    ['元', '万', '亿'],
    ['', '拾', '佰', '仟']
  ];

  const head = n < 0 ? '欠' : '';
  const s = Math.abs(n).toFixed(2);
  const integerPart = s.split('.')[0];
  const decimalPart = s.split('.')[1] || '00';

  let result = '';

  // 整数部分
  for (let i = 0; i < integerPart.length; i++) {
    const d = parseInt(integerPart[i]);
    const p = integerPart.length - i - 1;
    const uIdx = p % 4;
    const gIdx = Math.floor(p / 4);

    if (d === 0) {
      // 处理零：只在需要的位置显示
      if (result.length > 0 && result[result.length - 1] !== '零' && uIdx !== 0) {
        result += digit[d];
      }
      if (uIdx === 0 && gIdx > 0) {
        result += unit[0][gIdx];
      }
    } else {
      result += digit[d] + unit[1][uIdx];
      if (uIdx === 0 && gIdx > 0) {
        result += unit[0][gIdx];
      }
    }
  }

  // 清理末尾的零
  result = result.replace(/零+$/, '');
  if (!result.endsWith('元') && !result.endsWith('万') && !result.endsWith('亿')) {
    result += '元';
  }

  // 小数部分
  let hasDecimal = false;
  for (let i = 0; i < 2; i++) {
    const d = parseInt(decimalPart[i]);
    if (d !== 0) {
      result += digit[d] + fraction[i];
      hasDecimal = true;
    }
  }

  if (!hasDecimal) {
    result += '整';
  }

  return head + result;
}

/**
 * 格式化日期时间
 * @param {number|string} timestamp - 时间戳
 * @param {boolean} withTime - 是否包含时间
 * @returns {string}
 */
function formatDate(timestamp, withTime = true) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  // 强制按北京时间 (UTC+8) 输出，避免服务器时区差异
  const offset = date.getTimezoneOffset() + 480;
  const bj = new Date(date.getTime() + offset * 60000);

  const year = bj.getFullYear();
  const month = (bj.getMonth() + 1).toString().padStart(2, '0');
  const day = bj.getDate().toString().padStart(2, '0');

  if (!withTime) {
    return `${year}-${month}-${day}`;
  }
  const hours = bj.getHours().toString().padStart(2, '0');
  const minutes = bj.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function buildFileName(order) {
  const addr = order.user_address || {};
  const street = (addr.street_name || '').replace(/[\\/:*?"<>|]/g, '').substring(0, 12);
  const name = (addr.user_name || '').replace(/[\\/:*?"<>|]/g, '');
  const tel = (addr.mobile || '').replace(/[\\/:*?"<>|]/g, '');

  // UTC
  const date = new Date();
  // 强制按北京时间 (UTC+8) 输出，避免服务器时区差异
  const offset = date.getTimezoneOffset() + 480;
  const now = new Date(date.getTime() + offset * 60000);

  const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}--${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
  return `${street}-${name}-${tel}-${timeStr}`;
}



async function buildPdfDefinition(order) {
  const addr = order.user_address || {};
  const goodsList = order.goods_list || [];
  const totalCount = goodsList.reduce((sum, g) => sum + (g.count || 0), 0);

  const tableBody = [
    [
		{ text: '行号' , style: 'tableHeader', alignment: 'center'},
      { text: '条码', style: 'tableHeader', alignment: 'center' },
      { text: '商品名称', style: 'tableHeader', alignment: 'center' },
	  { text: '数量', style: 'tableHeader', alignment: 'center' },
      { text: '规格', style: 'tableHeader', alignment: 'center' },
      { text: '单价', style: 'tableHeader', alignment: 'center' },
      { text: '金额', style: 'tableHeader', alignment: 'center' },
	  { text: '备注', style: 'tableHeader', alignment: 'center'},
    ]
  ];

  goodsList.forEach((good, idx) => {
   
    tableBody.push([
      
       { text: String(idx + 1), alignment: 'center', fontSize: 10 },
      { text: good.sku || '-', alignment: 'center', fontSize: 9},
      { text: good.name || '', fontSize: 9, alignment: 'center' },
	   { text: String(good.count || 0), alignment: 'center', fontSize: 10 },
      { text: good.standard || '-', alignment: 'center', fontSize: 9 },
      { text: '¥' + formatPrice(good.price), alignment: 'center', fontSize: 10 }, 
      { text: '¥' + formatPrice(good.total), alignment: 'center', fontSize: 10, bold: true },
	  {}
    ]);
  });

  return {
    pageSize: { width: 683, height: 264 },  // 241×93mm
    pageMargins: [36, 4, 36, 14],   // 边距  依次 左 上 右 下  下面页脚显示页码  票据纸张左右有空 
    defaultStyle: { font: 'NotoSansSC', fontSize: 10, color: '#333' },
    styles: {
      title: { fontSize: 11, bold: true, alignment: 'center', color: '#333', margin: [0, 0, 0, 0] },
      sectionTitle: { fontSize: 10, bold: true, color: '#333', margin: [0, 0, 0, 0], borderLeft: [0, 0, 0, '#007aff'], paddingLeft: 0 },
      tableHeader: { fontSize: 10, bold: true, color: '#333', fillColor: '#f5f5f5', alignment: 'center' },
      infoLabel: { color: '#888', fontSize: 10 },
      summaryTotal: { fontSize: 10, bold: true, color: '#333' },
      footer: { fontSize: 9, color: '#333'}
    },
  
    footer: function (currentPage, pageCount) {
      return {
        margin: [36, 0, 36, 0],  // ← 加这里，与 pageMargins 左右一致
        columns: [
          {
            text: `开江县建鸿副食店销售单  ·  联系电话：15328949176`,
            alignment: 'left',
			 fontSize: 9, color: '#333'
          },
          {
            text: `出单时间：${formatDate(Date.now())}  ·  第 ${currentPage} 页 / 共 ${pageCount} 页`,
            alignment: 'right',
			 fontSize: 9, color: '#333'
          }
        ]
      };
    },
    content: [
      { text: '开江县建鸿副食店销售单', style: 'title' },
      {
        columns: [
			{ text: `收货人/单位：${addr.user_name || '-'}`, fontSize: 10},
			{ text: `电话：${addr.mobile || '-'}`, width: '20%', fontSize: 10 },	
			{ text: `客户备注：${ order.remark || '-'}`,fontSize: 10}, 
			{ text: `创建时间：${ formatDate(order.create_date)}`,fontSize: 10, alignment: 'right' },
		   ],
		},
		{
		  columns: [
			  { text: `地址：${ addr.formatted_address || '-'}`,fontSize: 10},
			  ...(addr.alias ? [{ text: [ { text: `地址别名：${ addr.alias }` , fontSize: 10}]  }] : []),
			 	{ text: `订单编号：${ order.order_no || '-'}`, fontSize: 10, alignment: 'right' },
			  ],
		},
      {
        table: {
          headerRows: 1,
          widths: [25, 80, '*', 30, 70, 60, 60, 50],
          body: tableBody
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#ddd' : '#eee',
          vLineColor: () => '#ddd',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        }
      },
      
      {
        columns: [
			{ text: `签收人：`, fontSize: 10, width: '15%', bold: true},
			{ text: `商品总数：${totalCount} `, fontSize: 9, width: '12%'},
			{ text: `获得积分：${formatPrice(order.score_earned)}`, fontSize: 9, width: '12%'},
          { text: `本单总计小写：¥${formatPrice(order.total_amount)}`, style: 'summaryTotal'},
          { text: `本单总计大写：${amountToChinese(order.total_amount)}`, style: 'summaryTotal', alignment: 'right' }
        ],
        margin: [0, 0, 0, 0]
      },
      
    ]
  };
}

/**
 * 删除旧的 PDF 文件
 */
async function deleteOldPdf(fileID) {
  if (!fileID) return;
  try {
    await uniCloud.deleteFile({ fileList: [fileID] });
  } catch (err) {
    console.log('删除旧PDF失败（可忽略）:', err.message);
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { orderId } = event;

  if (!orderId) {
    return { code: -1, message: '缺少订单ID' };
  }

  const missingFonts = checkFonts();
  if (missingFonts.length > 0) {
    return {
      code: -1,
      message: `缺少中文字体文件，请将字体文件放入云函数 fonts/ 目录: ${missingFonts.join(', ')}`
    };
  }

  try {
    const db = uniCloud.database();
    const _ = db.command;

    // 查询订单
    const orderRes = await db.collection('uni-pay-orders').doc(orderId).get();
    const order = orderRes.data && orderRes.data[0] ? orderRes.data[0] : null;

    if (!order) {
      return { code: -1, message: '订单不存在' };
    }

    // 如果已有 PDF，先删除旧文件（避免云存储堆积）
    if (order.pdf_file_id) {
      await deleteOldPdf(order.pdf_file_id);
    }

    // 生成 PDF
    const printer = new PdfPrinter(fonts);
    const docDefinition = await buildPdfDefinition(order);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // 收集 PDF 数据
    const chunks = [];
    const pdfBuffer = await new Promise((resolve, reject) => {
      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });

    const fileName = buildFileName(order) + '.pdf';

    // 上传到 uniCloud 云存储
    const uploadRes = await uniCloud.uploadFile({
      cloudPath: `order-pdfs/${fileName}`,
      fileContent: pdfBuffer,
      cloudPathAsRealPath: true,
    });

    const fileID = uploadRes.fileID;
    if (!fileID) {
      throw new Error('上传文件失败：未返回 fileID');
    }

    // 阿里云私有 bucket 时 fileURL 可能为空，需要获取临时访问链接
    let fileUrl = uploadRes.fileURL;
    if (!fileUrl) {
      const tempRes = await uniCloud.getTempFileURL({
        fileList: [fileID]
      });
      if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
        fileUrl = tempRes.fileList[0].tempFileURL;
      }
    }

    if (!fileUrl) {
      throw new Error('获取文件访问链接失败，请检查云存储配置');
    }

    // 更新订单表，存入 pdf_file_url 和 pdf_file_id
    await db.collection('uni-pay-orders').doc(orderId).update({
      pdf_file_url: fileUrl,
      pdf_file_id: fileID,
      pdf_generated_at: Date.now()
    });

    return {
      code: 0,
      message: 'PDF生成成功',
      data: {
        fileID: fileID,
        fileUrl: fileUrl,
        fileName: fileName
      }
    };

  } catch (err) {
    console.error('生成PDF失败:', err);
    return { code: -1, message: err.message || '生成PDF失败' };
  }
};