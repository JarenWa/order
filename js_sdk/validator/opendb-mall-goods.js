const validator = {
  "sku": {
    "rules": [
      { "required": true },
      { "format": "string" },
      { "maxLength": 30 }
    ],
    "title": "货号",
    "label": "货号"
  },
  "name": {
    "rules": [
      { "required": true },
      { "format": "string" },
      { "maxLength": 30 }
    ],
    "title": "名称",
    "label": "名称"
  },
  "remain_count": {
    "rules": [
      { "required": true },
      { "format": "int" }
    ],
    "title": "库存数量",
    "defaultValue": 0,
    "label": "库存数量"
  },
  "goods_price": {
    "rules": [
      { "required": true },
      { "format": "int" }
    ],
    "title": "售价",
    "label": "售价"
  },
  "original_price": {
    "rules": [
      { "format": "int" }
    ],
    "title": "原价",
    "label": "原价"
  },
  "standard": {
    "rules": [
      { "required": true },
      { "format": "string" },
      { "maxLength": 30 }
    ],
    "title": "商品规格",
    "label": "商品规格"
  },
  "category": {
    "rules": [
      { "format": "string" }
    ],
    "title": "商品类别",
    "label": "商品类别"
  },
  "goods_desc": {
    "rules": [
      { "format": "string" },
      { "maxLength": 50 }
    ],
    "title": "商品简介",
    "label": "商品简介"
  },
  "goods_remark": {
    "rules": [
      { "format": "string" },
      { "maxLength": 50 }
    ],
    "title": "商品备注",
    "label": "商品备注"
  },
  "shelf_life_months": {
    "rules": [
      { "format": "int" }
    ],
    "title": "保质期(月)",
    "label": "保质期(月)"
  },
  "goods_thumb": {
    "rules": [
      { "format": "string" },
      { "pattern": "^(http://|https://|/|./|@/)\\S" }
    ],
    "title": "缩略图",
    "label": "缩略图"
  },
  "goods_swiper_imgs": {
    "rules": [
      { "format": "array" }
    ],
    "title": "详情轮播图",
    "label": "详情轮播图"
  },
  "is_hot": {
    "rules": [
      { "format": "bool" }
    ],
    "title": "热销",
    "defaultValue": false,
    "label": "热销"
  },
  "is_new": {
    "rules": [
      { "format": "bool" }
    ],
    "title": "新品",
    "defaultValue": false,
    "label": "新品"
  },
  "is_pre": {
    "rules": [
      { "format": "bool" }
    ],
    "title": "预售",
    "defaultValue": false,
    "label": "预售"
  },
  "is_on_sale": {
    "rules": [
      { "format": "bool" }
    ],
    "title": "上架",
    "defaultValue": true,
    "label": "上架"
  },
  "warning_count": {
    "rules": [
      { "format": "int" }
    ],
    "title": "预警阈值",
    "defaultValue": 10,
    "label": "预警阈值"
  },
  "sort_weight": {
    "rules": [
      { "format": "int" }
    ],
    "title": "排序权重",
    "defaultValue": 0,
    "label": "排序权重"
  },
  "operater": {
    "rules": [
      { "format": "string" }
    ],
    "title": "操作员",
    "label": "操作员"
  }
}

const enumConverter = {}

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
