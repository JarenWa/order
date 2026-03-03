// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "provider": {
    "rules": [
      {
        "format": "string"
      },
      {
        "range": [
          {
            "text": "微信支付",
            "value": "wxpay"
          },
          {
            "text": "支付宝",
            "value": "alipay"
          },
          {
            "text": "苹果应用内支付",
            "value": "appleiap"
          }
        ]
      }
    ],
    "title": "支付供应商",
    "label": "支付供应商"
  },
  "provider_pay_type": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "支付方式",
    "label": "支付方式"
  },
  "uni_platform": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "应用平台",
    "label": "应用平台"
  },
  "status": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "text": "已关闭",
            "value": -1
          },
          {
            "text": "未支付",
            "value": 0
          },
          {
            "text": "已支付",
            "value": 1
          },
          {
            "text": "已部分退款",
            "value": 2
          },
          {
            "text": "已全额退款",
            "value": 3
          }
        ]
      }
    ],
    "title": "订单状态",
    "defaultValue": 0,
    "label": "订单状态"
  },
  "type": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "订单类型",
    "label": "订单类型"
  },
  "order_no": {
    "rules": [
      {
        "format": "string"
      },
      {
        "minLength": 20,
        "maxLength": 28
      }
    ],
    "title": "业务系统订单号",
    "label": "业务系统订单号"
  },
  "out_trade_no": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "支付插件订单号",
    "label": "支付插件订单号"
  },
  "transaction_id": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "交易单号",
    "label": "交易单号"
  },
  "user_id": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "用户ID",
    "label": "用户ID"
  },
  "nickname": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "用户昵称",
    "label": "用户昵称"
  },
  "device_id": {
    "rules": [
      {
        "format": "string"
      }
    ]
  },
  "client_ip": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "客户端IP",
    "label": "客户端IP"
  },
  "openid": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "openid",
    "label": "openid"
  },
  "description": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "支付描述",
    "label": "支付描述"
  },
  "err_msg": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "支付失败原因",
    "label": "支付失败原因"
  },
  "total_fee": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "订单总金额",
    "label": "订单总金额"
  },
  "refund_fee": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "订单总退款金额",
    "label": "订单总退款金额"
  },
  "refund_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "当前退款笔数",
    "label": "当前退款笔数"
  },
  "refund_list": {
    "rules": [
      {
        "format": "array"
      }
    ],
    "title": "退款详情",
    "label": "退款详情"
  },
  "provider_appid": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "开放平台appid",
    "label": "开放平台appid"
  },
  "appid": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "DCloud AppId",
    "label": "DCloud AppId"
  },
  "user_order_success": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "回调状态",
    "label": "回调状态"
  },
  "pay_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "支付时间",
    "label": "支付时间"
  },
  "notify_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "异步通知时间",
    "label": "异步通知时间"
  },
  "cancel_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "取消时间",
    "label": "取消时间"
  },
  "refund_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "最近退款时间",
    "label": "最近退款时间"
  }
}

const enumConverter = {
  "provider_valuetotext": {
    "wxpay": "微信支付",
    "alipay": "支付宝",
    "appleiap": "苹果应用内支付"
  },
  "status_valuetotext": {
    "0": "未支付",
    "1": "已支付",
    "2": "已部分退款",
    "3": "已全额退款",
    "-1": "已关闭"
  }
}

function filterToWhere(filter, command) {
  let where = {}
  for (let field in filter) {
    let { type, value } = filter[field]
    switch (type) {
      case "search":
        if (typeof value === 'string' && value.length) {
          where[field] = new RegExp(value)
        }
        break;
      case "select":
        if (value.length) {
          let selectValue = []
          for (let s of value) {
            selectValue.push(command.eq(s))
          }
          where[field] = command.or(selectValue)
        }
        break;
      case "range":
        if (value.length) {
          let gt = value[0]
          let lt = value[1]
          where[field] = command.and([command.gte(gt), command.lte(lt)])
        }
        break;
      case "date":
        if (value.length) {
          let [s, e] = value
          let startDate = new Date(s)
          let endDate = new Date(e)
          where[field] = command.and([command.gte(startDate), command.lte(endDate)])
        }
        break;
      case "timestamp":
        if (value.length) {
          let [startDate, endDate] = value
          where[field] = command.and([command.gte(startDate), command.lte(endDate)])
        }
        break;
    }
  }
  return where
}

export { validator, enumConverter, filterToWhere }
