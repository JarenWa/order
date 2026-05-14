// cloudfunctions/migrate-goods/index.js
const db = uniCloud.database()

exports.main = async (event, context) => {
  const { action = 'migrate' } = event
  
  if (action === 'migrate') {
    return await doMigrate()
  }
  if (action === 'verify') {
    return await doVerify()
  }
  
  return { code: -1, msg: '未知操作' }
}

// 执行迁移
async function doMigrate() {
  const oldColl = db.collection('opendb-mall-goods')
  const newColl = db.collection('goods')
  
  const { data: oldList } = await oldColl.limit(1000).get()
  
  if (oldList.length === 0) {
    return { code: -1, msg: '旧表无数据' }
  }
  
  let success = 0
  let skip = 0
  let errors = []
  
  for (const old of oldList) {
    try {
      const exist = await newColl.doc(old._id).get()
      if (exist.data.length > 0) {
        skip++
        continue
      }
    } catch (e) {}
    
    // 处理图片
    const swiperImgs = old.goods_swiper_imgs || []
    const thumb = old.goods_thumb || (swiperImgs.length > 0 ? swiperImgs[0] : '')
    const filteredSwiper = swiperImgs.length > 0 && swiperImgs[0] === thumb 
      ? swiperImgs.slice(1) 
      : swiperImgs
    
    // 只保留新表存在的字段
    const newDoc = {
      // 系统字段
      _id: old._id,
      
      // 核心字段
      sku: '',
      name: old.name,
      category: old.category || '未分类',
      standard: old.standard,
      goods_price: old.goods_price,
      original_price: old.goods_price,
      
      // 库存（重新开始）
      remain_count: old.remain_count || 0,
      locked_count: 0,
      total_inbound: 0,
      total_sold: 0,
      warning_count: 10,
      
      // 描述
      goods_desc: old.goods_desc || '',
      goods_remark: '',
      
      // 保质期
      shelf_life_months: old.shelf_life_months || 0,
      
      // 图片（处理后的）
      goods_thumb: thumb,
      goods_swiper_imgs: filteredSwiper,
      
      // 状态
      is_hot: old.is_hot || false,
      is_new: old.is_new || false,
      is_pre: old.is_pre || false,
      is_on_sale: old.is_on_sale !== false,
      sort_weight: 0,
      
      // 操作记录
      operater: old.operater || '',
      created_at: old.add_date || Date.now(),
      updated_at: old.last_modify_date || Date.now()
    }
    
    try {
      await newColl.add(newDoc)
      success++
    } catch (e) {
      errors.push({ id: old._id, name: old.name, error: e.message })
    }
  }
  
  return {
    code: 0,
    msg: '迁移完成',
    total: oldList.length,
    success,
    skip,
    errorCount: errors.length,
    errors: errors.slice(0, 5)
  }
}

// 验证
async function doVerify() {
  const newColl = db.collection('goods')
  const { total } = await newColl.count()
  const { data: samples } = await newColl.limit(3).get()
  
  return {
    code: 0,
    total,
    samples: samples.map(s => ({
      id: s._id,
      sku: s.sku || '[待录入]',
      name: s.name,
      thumb: s.goods_thumb,
      swiperCount: (s.goods_swiper_imgs || []).length,
      remain: s.remain_count
    }))
  }
}