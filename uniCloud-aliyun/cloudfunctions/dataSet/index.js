'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  let totalUpdated = 0;
  let hasMore = true;
  
  while (hasMore) {
    const res = await db.collection('goods')
      .where({})
      .limit(1000)
      .update({
        goods_remark: '',
        remain_count: 0,
        total_inbound: 0,
        total_sold: 0
  
      });
    
    totalUpdated += res.updated || 0;
    hasMore = (res.updated === 1000); // 如果正好1000条，可能还有更多
  }
  
  return { code: 0, updated: totalUpdated };
};