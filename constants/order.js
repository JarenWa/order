/**
 * 订单状态常量
 */
export const ORDER_STATUS = {
  PENDING: 0,      // 待发货（原待付款，本项目无支付环节）
  SHIPPING: 1,     // 配送中
  RECEIVED: 2,     // 已收货
  CANCELLED: 3,    // 已取消
  COMPLETED: 4,    // 已完成（预留）
  DELETED: -2,     // 用户删除
};

export const ORDER_STATUS_MAP = {
  [ORDER_STATUS.PENDING]: '待发货',
  [ORDER_STATUS.SHIPPING]: '配送中',
  [ORDER_STATUS.RECEIVED]: '已收货',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.COMPLETED]: '已完成',
};

export const ORDER_STATUS_COLOR = {
  [ORDER_STATUS.PENDING]: '#ff9800',
  [ORDER_STATUS.SHIPPING]: '#2196f3',
  [ORDER_STATUS.RECEIVED]: '#4caf50',
  [ORDER_STATUS.CANCELLED]: '#999999',
};
