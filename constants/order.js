/**
 * 订单状态常量
 */
export const ORDER_STATUS = {
  PENDING: 0,      // 待处理
  SHIPPING: 1,     // 配送中
  RECEIVED: 2,     // 已收货
  CANCELLED: 3,    // 已取消
  PROCESSING: 4,    //已出单
 
};

export const ORDER_STATUS_MAP = {
  [ORDER_STATUS.PENDING]: '待处理',
  [ORDER_STATUS.SHIPPING]: '配送中',
  [ORDER_STATUS.RECEIVED]: '已收货',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.PROCESSING]: '已出单',
};

export const ORDER_STATUS_COLOR = {
  [ORDER_STATUS.PENDING]: '#ff9800',
  [ORDER_STATUS.SHIPPING]: '#2196f3',
  [ORDER_STATUS.RECEIVED]: '#4caf50',
  [ORDER_STATUS.CANCELLED]: '#999999',
};
