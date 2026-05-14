'use strict';

const fs = require('fs');
const path = require('path');
const PdfPrinter = require('pdfmake');
const bwipjs = require('bwip-js');

// pdfmake 中文字体配置
// 请将 NotoSansSC 字体文件放到本文件同级的 fonts/ 目录下
const FONT_DIR = path.join(__dirname, 'fonts');
const fonts = {
  NotoSansSC: {
    normal: path.join(FONT_DIR, 'NotoSansSC-Regular.otf'),
    bold: path.join(FONT_DIR, 'NotoSansSC-Bold.otf'),
    italics: path.join(FONT_DIR, 'NotoSansSC-Regular.otf'),
    bolditalics: path.join(FONT_DIR, 'NotoSansSC-Bold.otf')
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

// function formatPrice(price) {
//   if (price === undefined || price === null) return '0.00';
//   return Number(price).toFixed(2);
// }

/**
 * 格式化日期时间
 * @param {number|string} timestamp - 时间戳
 * @param {boolean} withTime - 是否包含时间
 * @returns {string}
 */

function formatDate(timestamp , withTime = true) {
	    if (!timestamp) return '-'
	    const date = new Date(timestamp)
	    // 强制按北京时间 (UTC+8) 输出，避免服务器时区差异
	    const offset = date.getTimezoneOffset() + 480
	    const bj = new Date(date.getTime() + offset * 60000)
	    
		const year = bj.getFullYear()
	    const month = (bj.getMonth() + 1).toString().padStart(2, '0')
	    const day = bj.getDate().toString().padStart(2, '0')

		if (!withTime) {
		  return `${year}-${month}-${day}`;
		}
	    const hours = bj.getHours().toString().padStart(2, '0')
	    const minutes = bj.getMinutes().toString().padStart(2, '0')
	    return `${year}-${month}-${day} ${hours}:${minutes}`
	  }
// function formatDate(date) {
//   if (!date) return '-';
//   const d = new Date(date);
//   if (isNaN(d.getTime())) return String(date);
//   const pad = (n) => String(n).padStart(2, '0');
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
// }

function buildFileName(order) {
  const addr = order.user_address || {};
  const street = (addr.street_name || '').replace(/[\\/:*?"<>|]/g, '').substring(0, 12);
  const name = (addr.user_name || '').replace(/[\\/:*?"<>|]/g, '');
  const tel = (addr.mobile || '').replace(/[\\/:*?"<>|]/g, '');
  
  //UTC
  const date = new Date()
  // 强制按北京时间 (UTC+8) 输出，避免服务器时区差异
  const offset = date.getTimezoneOffset() + 480
  const now= new Date(date.getTime() + offset * 60000)
  
  const timeStr =  `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}--${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`
  return `${street}-${name}-${tel}-${timeStr}`;
}

function getStatusText(order) {
  let text = STATUS_MAP[order.status] || '未知';
  if (order.status === 3 && order.admin_cancelled) text = '(后台)已取消';
  if (order.status === 2 && order.admin_completed) text = '(后台)已收货';
  return text;
}

async function buildPdfDefinition(order) {
  const addr = order.user_address || {};
  const goodsList = order.goods_list || [];
  const totalCount = goodsList.reduce((sum, g) => sum + (g.count || 0), 0);

  const barcodePromises = goodsList.map(g => generateBarcode(g.sku));
  const barcodes = await Promise.all(barcodePromises);

  const tableBody = [
    [
      { text: '条形码', style: 'tableHeader', alignment: 'center' },
      { text: '商品名称', style: 'tableHeader' },
      { text: '规格', style: 'tableHeader', alignment: 'center' },
      { text: '单价', style: 'tableHeader', alignment: 'right' },
      { text: '数量', style: 'tableHeader', alignment: 'center' },
      { text: '小计', style: 'tableHeader', alignment: 'right' },
    ]
  ];

  goodsList.forEach((good, idx) => {
    const barcodeImg = barcodes[idx];
    tableBody.push([
      barcodeImg 
        ? { image: barcodeImg, width: 70, alignment: 'center', margin: [0, 2, 0, 2] }
        : { text: good.sku || '-', alignment: 'center', fontSize: 9, color: '#999' },
      { text: good.name || '', fontSize: 10 },
      { text: good.standard || '-', alignment: 'center', fontSize: 10 },
      { text: '¥' + formatPrice(good.price), alignment: 'right', fontSize: 10 },
      { text: String(good.count || 0), alignment: 'center', fontSize: 10 },
      { text: '¥' + formatPrice(good.total), alignment: 'right', fontSize: 10, bold: true },
    ]);
  });

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'NotoSansSC', fontSize: 10, color: '#333' },
    styles: {
      title: { fontSize: 18, bold: true, alignment: 'center', color: '#333', margin: [0, 0, 0, 16] },
      sectionTitle: { fontSize: 12, bold: true, color: '#333', margin: [0, 12, 0, 8], borderLeft: [3, 0, 0, '#007aff'], paddingLeft: 8 },
      tableHeader: { fontSize: 10, bold: true, color: '#333', fillColor: '#f5f5f5' },
      infoLabel: { color: '#888', fontSize: 10 },
      summaryTotal: { fontSize: 13, bold: true, color: '#ff6000' },
      footer: { fontSize: 9, color: '#999', alignment: 'right', margin: [0, 20, 0, 0] }
    },
    content: [
      { text: buildFileName(order), style: 'title' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#333' }] },
      { text: '订单信息', style: 'sectionTitle' },
      {
        columns: [
          { text: `订单号：${order.order_no || '-'}`, width: '50%', fontSize: 10 },
          { text: `创建时间：${formatDate(order.create_date)}`, width: '50%', fontSize: 10 }
        ],
        margin: [0, 0, 0, 4]
      },
      {
        columns: [
          { text: `状态：${getStatusText(order)}`, width: '50%', fontSize: 10 },
          { text: order.is_pre_order ? '类型：预售订单' : '', width: '50%', fontSize: 10 }
        ],
        margin: [0, 0, 0, 8]
      },
      { text: '收货信息', style: 'sectionTitle' },
      {
        columns: [
          { text: [{ text: '收货人/单位：', style: 'infoLabel' }, addr.user_name || '-'], width: '50%', fontSize: 10 },
          { text: [{ text: '电话：', style: 'infoLabel' }, addr.mobile || '-'], width: '50%', fontSize: 10 }
        ],
        margin: [0, 0, 0, 4]
      },
      {
        text: [{ text: '地址：', style: 'infoLabel' }, addr.formatted_address || '-'],
        margin: [0, 0, 0, 4]
      },
      ...(addr.alias ? [{ text: [{ text: '地址别名：', style: 'infoLabel' }, addr.alias], margin: [0, 0, 0, 4] }] : []),
      ...(order.remark ? [{ text: [{ text: '备注：', style: 'infoLabel' }, order.remark], margin: [0, 0, 0, 8] }] : [{ text: '', margin: [0, 0, 0, 8] }]),
      { text: '商品清单', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: [80, '*', 70, 60, 50, 60],
          body: tableBody
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#ddd' : '#eee',
          vLineColor: () => '#ddd',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        }
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#333' }],
        margin: [0, 16, 0, 12]
      },
      {
        columns: [
          { text: `商品件数：${totalCount} 件`, fontSize: 11 },
          { text: `合计金额：¥${formatPrice(order.total_amount)}`, style: 'summaryTotal', alignment: 'right' }
        ],
        margin: [0, 0, 0, 6]
      },
      {
        text: `获得积分：${formatPrice(order.score_earned)}`,
        fontSize: 11,
        margin: [0, 0, 0, 8]
      },
      { text: `打印时间：${formatDate(Date.now())}`, style: 'footer' }
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
	  cloudPathAsRealPath:true,
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