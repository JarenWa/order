"use strict";
const validator = {
  "name": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      },
      {
        "maxLength": 15
      }
    ],
    "title": "名称",
    "label": "名称"
  },
  "remain_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "库存数量",
    "defaultValue": 999,
    "label": "库存数量"
  },
  "goods_price": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "int"
      }
    ],
    "title": "价格",
    "label": "价格"
  },
  "goods_desc": {
    "rules": [
      {
        "format": "string"
      },
      {
        "maxLength": 15
      }
    ],
    "title": "商品简介",
    "label": "商品简介"
  },
  "standard": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      },
      {
        "maxLength": 15
      }
    ],
    "title": "商品规格",
    "label": "商品规格"
  },
  "category": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "商品类别",
    "label": "商品类别"
  },
  "goods_swiper_imgs": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "array"
      }
    ],
    "title": "详情轮播图",
    "label": "详情轮播图"
  },
  "goods_introduce_imgs": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "array"
      }
    ],
    "title": "详情介绍图",
    "label": "详情介绍图"
  },
  "goods_thumb": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      },
      {
        "pattern": "^(http://|https://|/|./|@/)\\S"
      }
    ],
    "title": "缩略图地址",
    "label": "缩略图地址"
  },
  "is_hot": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "是否热销",
    "label": "是否热销"
  },
  "is_new": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "是否新品",
    "label": "是否新品"
  },
  "is_on_sale": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "是否上架",
    "defaultValue": true,
    "label": "是否上架"
  },
  "tag": {
    "rules": [
      {
        "format": "array"
      }
    ]
  },
  "comment_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "评论数",
    "defaultValue": 0,
    "label": "评论数"
  },
  "total_sell_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "销量",
    "defaultValue": 0,
    "label": "销量"
  },
  "last_modify_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "最后修改时间",
    "defaultValue": {
      "$env": "now"
    },
    "label": "最后修改时间"
  },
  "operater": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "操作员",
    "label": "操作员"
  }
};
exports.validator = validator;
//# sourceMappingURL=../../../.sourcemap/mp-weixin/js_sdk/validator/opendb-mall-goods.js.map
