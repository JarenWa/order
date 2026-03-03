"use strict";
const validator = {
  "name": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      }
    ],
    "title": "类别名称",
    "label": "类别名称"
  },
  "sort": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "排序",
    "label": "排序"
  },
  "description": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "类别描述",
    "label": "类别描述"
  }
};
const enumConverter = {};
exports.enumConverter = enumConverter;
exports.validator = validator;
//# sourceMappingURL=../../../.sourcemap/mp-weixin/js_sdk/validator/opendb-mall-categories.js.map
